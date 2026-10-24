<?php
/**
 * Test d'intégration de l'API locale (PHP + MySQL).
 *
 *     php scripts/api-smoke.php        (le serveur npm start doit tourner)
 *
 * Chaque contrôle appelle réellement les routes /api/* et vérifie la réponse.
 * Les données créées pendant le test sont supprimées à la fin.
 */

declare(strict_types=1);

require __DIR__ . '/../config/app.php';

const BASE = 'http://localhost:8080';

$controles = [];
$nettoyages = [];

function verifier(string $libelle, bool $ok, string $detail = ''): void
{
    global $controles;
    $controles[] = ['libelle' => $libelle, 'ok' => $ok, 'detail' => $detail];
}

function requete(string $methode, string $chemin, $corps = null, array $query = []): array
{
    $url = BASE . $chemin;
    if ($query) {
        $url .= '?' . http_build_query($query);
    }

    $entetes = ['Accept: application/json'];
    $contenu = null;
    if ($corps !== null) {
        $entetes[] = 'Content-Type: application/json';
        $contenu = json_encode($corps, JSON_UNESCAPED_UNICODE);
    } elseif ($methode === 'POST') {
        $entetes[] = 'Content-Type: application/json';
        $contenu = '{}';
    }

    $contexte = stream_context_create([
        'http' => [
            'method'        => $methode,
            'header'        => implode("\r\n", $entetes),
            'content'       => $contenu ?? '',
            'ignore_errors' => true,
            'timeout'       => 20,
        ],
    ]);

    $reponse = @file_get_contents($url, false, $contexte);
    $statut = 0;
    foreach ($http_response_header ?? [] as $ligne) {
        if (preg_match('#^HTTP/\S+\s+(\d+)#', $ligne, $m)) {
            $statut = (int) $m[1];
        }
    }

    return [
        'statut' => $statut,
        'json'   => $reponse === false ? null : json_decode($reponse, true),
        'brut'   => $reponse,
    ];
}

function nettoyer(callable $action): void
{
    global $nettoyages;
    array_unshift($nettoyages, $action);
}

function executer_nettoyage(): void
{
    global $nettoyages;
    foreach ($nettoyages as $action) {
        try {
            $action();
        } catch (Throwable $e) {
            echo '  nettoyage : ' . $e->getMessage() . "\n";
        }
    }
    $nettoyages = [];
}

function attente(float $secondes): void
{
    usleep((int) ($secondes * 1000000));
}

$codeGerant = 'GERANT001';

try {
    /* 1. Assurances ---------------------------------------------------- */
    $r = requete('GET', '/api/assurance');
    verifier('GET /assurance : 200', $r['statut'] === 200, (string) $r['statut']);
    verifier('GET /assurance : liste non vide', !empty($r['json']['data']), json_encode($r['json']));

    /* 2. Connexion ----------------------------------------------------- */
    $r = requete('POST', '/api/utilisateur/connexion', [
        'numeroUtilisateur' => '+2250701010101',
        'codePinUtilisateur' => 'mauvais-code',
    ]);
    verifier('Connexion avec un mauvais code PIN refusée', $r['statut'] === 401, (string) $r['statut']);

    $r = requete('POST', '/api/utilisateur/connexion', [
        'numeroUtilisateur' => '0701010101',
        'codePinUtilisateur' => 'gerant123',
    ]);
    $profil = $r['json']['data'] ?? null;
    verifier('Connexion du gérant acceptée', $r['statut'] === 200 && !empty($profil['code_utilisateur']),
        json_encode($r['json'], JSON_UNESCAPED_UNICODE));
    verifier('Profil de type gestionnaire', ($profil['type_utilisateur'] ?? '') === 'Gestionnaire de pharmacie',
        (string) ($profil['type_utilisateur'] ?? ''));
    verifier('Adresse et ville renseignées', !empty($profil['adresse_utilisateur']) && !empty($profil['ville_utilisateur']),
        json_encode([$profil['adresse_utilisateur'] ?? null, $profil['ville_utilisateur'] ?? null], JSON_UNESCAPED_UNICODE));

    /* 3. Profil pharmacie --------------------------------------------- */
    $r = requete('POST', '/api/pharmacie/profilPharmacie', ['code_gerant' => $codeGerant]);
    $pharmacie = $r['json']['data'] ?? null;
    verifier('Profil pharmacie chargé', $r['statut'] === 200 && !empty($pharmacie['code_pharmacie']),
        json_encode($r['json'], JSON_UNESCAPED_UNICODE));
    verifier('Horaires disponibles', isset($pharmacie['horaire_semaine']),
        (string) ($pharmacie['horaire_semaine'] ?? ''));
    verifier('Assurances acceptées renvoyées en tableau', is_array($pharmacie['assurance_acceptees'] ?? null),
        json_encode($pharmacie['assurance_acceptees'] ?? null, JSON_UNESCAPED_UNICODE));

    /* 4. Garde --------------------------------------------------------- */
    $avant = (int) ($pharmacie['est_de_garde'] ?? 0);
    $nouveau = $avant === 1 ? 0 : 1;
    $r = requete('PUT', '/api/pharmacie/modifierstatutgarde', [
        'code_pharmacie' => $pharmacie['code_pharmacie'] ?? '',
        'est_de_garde'   => $nouveau === 1,
    ]);
    $apres = (int) ($r['json']['data']['est_de_garde'] ?? -1);
    verifier('Changement du statut de garde', $r['statut'] === 200 && $apres === $nouveau,
        "avant=$avant attendu=$nouveau obtenu=$apres statut={$r['statut']}");
    // Retour à l'état initial.
    requete('PUT', '/api/pharmacie/modifierstatutgarde', [
        'code_pharmacie' => $pharmacie['code_pharmacie'] ?? '',
        'est_de_garde'   => $avant === 1,
    ]);

    /* 5. Forfaits et abonnement --------------------------------------- */
    $r = requete('GET', '/api/abonnements/forfaits');
    $forfaits = $r['json']['data'] ?? [];
    verifier('GET /abonnements/forfaits : 3 forfaits', count($forfaits) === 3, (string) count($forfaits));
    $standard = null;
    foreach ($forfaits as $f) {
        if (($f['nom_forfait'] ?? '') === 'Standard') $standard = $f;
    }
    verifier('Forfait Standard avec fonctionnalités',
        $standard !== null && is_array($standard['fonctionnalites'] ?? null),
        json_encode($standard));

    $r = requete('GET', '/api/abonnements/actif', null, ['code_pharmacie' => $codeGerant]);
    verifier('GET /abonnements/actif : réponse exploitable', $r['statut'] === 200,
        json_encode($r['json']));

    $r = requete('GET', '/api/abonnements/historique/' . $codeGerant);
    verifier('GET /abonnements/historique : tableau', is_array($r['json']['data'] ?? null),
        json_encode($r['json']));

    $r = requete('GET', '/api/abonnements/utilisation/' . $codeGerant);
    $utilisation = $r['json']['data'] ?? [];
    verifier('GET /abonnements/utilisation : lignes avec limite',
        is_array($utilisation) && (empty($utilisation) || isset($utilisation[0]['nb_utilisations'])),
        json_encode($utilisation));

    /* 6. Contrôle d'accès --------------------------------------------- */
    $r = requete('POST', '/api/abonnements/verifier-acces', [
        'code_pharmacie'    => $codeGerant,
        'code_fonctionnalite' => 'ANNONCES',
    ]);
    verifier('Accès ANNONCES : réponse avec clé acces',
        in_array($r['statut'], [200, 403], true) && array_key_exists('acces', $r['json'] ?? []),
        json_encode($r['json']));

    $r = requete('POST', '/api/abonnements/verifier-acces', [
        'code_pharmacie'    => $codeGerant,
        'code_fonctionnalite' => 'FONCTION_INEXISTANTE',
    ]);
    verifier('Fonctionnalité inconnue refusée', $r['statut'] === 403 && ($r['json']['upgrade_required'] ?? false),
        json_encode($r['json']));

    /* 7. Annonces : création puis suppression -------------------------- */
    $r = requete('GET', '/api/annonces/pharmacie', null, ['code_gerant' => $codeGerant]);
    $annonces = $r['json']['data'] ?? [];
    verifier('GET /annonces/pharmacie : tableau', is_array($annonces), json_encode($r['json']));
    verifier('Les annonces exposent nombreVue', empty($annonces) || isset($annonces[0]['nombreVue']),
        json_encode($annonces[0] ?? null));

    $r = requete('POST', '/api/annonces/envoyer', [
        'titre'       => 'Annonce de test API',
        'contenu'     => 'Contenu de test créé par api-smoke.php.',
        'code_gerant' => $codeGerant,
        'type_annonce' => 'Information',
    ]);
    $annonce = $r['json']['data'] ?? null;
    $idAnnonce = (int) ($annonce['id_annonce'] ?? 0);
    verifier('Publication d\'une annonce', $r['statut'] === 200 && $idAnnonce > 0, json_encode($r['json']));
    if ($idAnnonce > 0) {
        nettoyer(function () use ($idAnnonce) {
            requete('DELETE', '/api/annonces', null, ['id_annonce' => $idAnnonce]);
        });
    }

    if ($idAnnonce > 0) {
        $r = requete('GET', '/api/annonces/pharmacie', null, ['code_gerant' => $codeGerant]);
        $trouve = false;
        foreach (($r['json']['data'] ?? []) as $a) {
            if ((int) $a['id_annonce'] === $idAnnonce) $trouve = true;
        }
        verifier('L\'annonce publiée apparaît dans la liste', $trouve);

        $r = requete('DELETE', '/api/annonces', null, ['id_annonce' => $idAnnonce]);
        verifier('Suppression de l\'annonce', $r['statut'] === 200 && ($r['json']['success'] ?? false),
            json_encode($r['json']));
        // déjà nettoyée
        $nettoyages = [];
    }

    /* 8. Newsletter ---------------------------------------------------- */
    $r = requete('POST', '/api/newsLetters/abonnement', ['codeUtilisateur' => $codeGerant]);
    $abonnes = $r['json']['data'] ?? [];
    verifier('GET des abonnés newsletter', is_array($abonnes), json_encode($r['json']));
    verifier('Abonnés avec statut', empty($abonnes) || isset($abonnes[0]['statut_abonnement']),
        json_encode($abonnes[0] ?? null));

    $r = requete('POST', '/api/newsletters/envoyer', [
        'code_pharmacie' => $pharmacie['code_pharmacie'] ?? '',
        'titre'          => 'Newsletter de test',
        'contenu'        => 'Contenu de test créé par api-smoke.php.',
    ]);
    $envoi = $r['json']['data'] ?? null;
    $idEnvoi = (int) ($envoi['id_envoi'] ?? 0);
    $idAnnonceNewsletter = (int) ($envoi['id_annonce'] ?? 0);
    verifier('Envoi de newsletter', $r['statut'] === 200 && $idEnvoi > 0, json_encode($r['json']));
    verifier('Nombre de destinataires calculé', $envoi !== null && array_key_exists('destinataires', $envoi),
        json_encode($envoi));

    if ($idEnvoi > 0 || $idAnnonceNewsletter > 0) {
        nettoyer(function () use ($idAnnonceNewsletter, $idEnvoi, $pharmacie) {
            $pdo = new PDO(
                sprintf('mysql:host=%s;port=%d;dbname=%s', BDD_HOST, BDD_PORT, BDD_NOM),
                BDD_USER,
                BDD_PASS,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );
            if ($idAnnonceNewsletter > 0) {
                $pdo->exec('DELETE FROM notifications WHERE id_annonce = ' . $idAnnonceNewsletter);
                $pdo->exec('DELETE FROM historique_vue WHERE id_annonce = ' . $idAnnonceNewsletter);
                $pdo->exec('DELETE FROM annonce WHERE id_annonce = ' . $idAnnonceNewsletter);
            }
            if ($idEnvoi > 0) {
                $pdo->exec('DELETE FROM envoi_newsletter WHERE id_envoi = ' . $idEnvoi);
            } else {
                $pdo->exec(
                    'DELETE FROM envoi_newsletter WHERE code_pharmacie = '
                    . $pdo->quote($pharmacie['code_pharmacie'] ?? '')
                    . " AND titre = 'Newsletter de test'"
                );
            }
        });
    }

    /* 9. Notifications -------------------------------------------------- */
    $r = requete('GET', '/api/notifications', null, ['code_utilisateur' => 'USER001']);
    verifier('GET /notifications : tableau', is_array($r['json']['data'] ?? null), json_encode($r['json']));

    /* 10. Inscription complète puis nettoyage -------------------------- */
    $numeroTest = '+2250700000991';
    $codeTest = null;

    $r = requete('POST', '/api/utilisateur/inscription', [
        'nomUtilisateur'      => 'TEST',
        'prenomUtilisateur'   => 'ApiSmoke',
        'numeroUtilisateur'   => $numeroTest,
        'codePinUtilisateur'  => '991122',
        'type_utilisateur'    => 'Gestionnaire de pharmacie',
        'assuranceUtilisateur' => '',
        'adresseUtilisateur'  => 'Quartier de test, Abidjan',
        'ville_utilisateur'   => 'Abidjan',
    ]);
    $nouvelUtilisateur = $r['json']['data'] ?? null;
    $codeTest = $nouvelUtilisateur['code_utilisateur'] ?? null;
    verifier('Inscription d\'un nouveau gérant', $r['statut'] === 200 && $codeTest !== null, json_encode($r['json'], JSON_UNESCAPED_UNICODE));

    if ($codeTest) {
        nettoyer(function () use ($codeTest) {
            $pdo = new PDO(
                sprintf('mysql:host=%s;port=%d;dbname=%s', BDD_HOST, BDD_PORT, BDD_NOM),
                BDD_USER,
                BDD_PASS,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );
            $q = $pdo->quote($codeTest);
            $pdo->exec('DELETE FROM utilisateur_gerant WHERE code_utilisateur = ' . $q);
            $pdo->exec('DELETE FROM utilisateur_assurance WHERE code_utilisateur = ' . $q);
            // Clés étrangères circulaires : on casse d'abord la liaison adresse.
            $pdo->exec('UPDATE utilisateurs SET id_adresse = NULL WHERE code_utilisateur = ' . $q);
            $pdo->exec('DELETE FROM adresse_utilisateur WHERE code_utilisateur = ' . $q);
            $pdo->exec('DELETE FROM utilisateurs WHERE code_utilisateur = ' . $q);
        });

        // Connexion avec les identifiants viennent d'être créés.
        $r = requete('POST', '/api/utilisateur/connexion', [
            'numeroUtilisateur'  => $numeroTest,
            'codePinUtilisateur' => '991122',
        ]);
        verifier('Connexion après inscription', ($r['json']['data']['code_utilisateur'] ?? '') === $codeTest,
            json_encode($r['json'], JSON_UNESCAPED_UNICODE));

        // Création de la pharmacie (formulaire d'inscription, étape 3).
        $r = requete('POST', '/api/pharmacie/ajouterPharmacie', [
            'code_gerant'           => $codeTest,
            'nom_pharmacie'         => 'Pharmacie de test API',
            'numero_pharmacie'      => '0700000991',
            'email_pharmacie'       => 'test@api.local',
            'ville_pharmacie'       => 'Abidjan',
            'adresse_fournit'       => 'Quartier de test',
            'horaires_en_semaine'   => '08:00 - 20:00',
            'horaires_samedi'       => '08:00 - 14:00',
            'horaires_dimanche'     => 'Fermée',
            'liste_assurance_accepte' => json_encode(['CNPS']),
            'latitudePharmacie'     => '0',
            'longitudePharmacie'    => '0',
        ]);
        $pharmacieTest = $r['json']['data'] ?? null;
        verifier('Création de la pharmacie (inscription étape 3)',
            $r['statut'] === 200 && !empty($pharmacieTest['code_pharmacie']),
            json_encode($r['json'], JSON_UNESCAPED_UNICODE));

        if (!empty($pharmacieTest['code_pharmacie'])) {
            $codePharmacieTest = $pharmacieTest['code_pharmacie'];
            nettoyer(function () use ($codePharmacieTest) {
                $pdo = new PDO(
                    sprintf('mysql:host=%s;port=%d;dbname=%s', BDD_HOST, BDD_PORT, BDD_NOM),
                    BDD_USER,
                    BDD_PASS,
                    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
                );
                foreach ([
                    'pharmacie_assurance', 'horaires_ouverture', 'envoi_newsletter', 'newsletter',
                    'annonce', 'notifications', 'vues_pharmacie',
                ] as $table) {
                    $pdo->exec("DELETE FROM `$table` WHERE code_pharmacie = " . $pdo->quote($codePharmacieTest));
                }
                $pdo->exec('DELETE FROM utilisateur_gerant WHERE code_pharmacie = ' . $pdo->quote($codePharmacieTest));
                $idAdresse = $pdo->query('SELECT id_adresse FROM pharmacie WHERE code_pharmacie = ' . $pdo->quote($codePharmacieTest))->fetchColumn();
                $pdo->exec('DELETE FROM pharmacie WHERE code_pharmacie = ' . $pdo->quote($codePharmacieTest));
                if ($idAdresse) {
                    $pdo->exec('DELETE FROM adresse_pharmacie WHERE id_adresse = ' . (int) $idAdresse);
                }
            });

            $r = requete('POST', '/api/pharmacie/profilPharmacie', ['code_gerant' => $codeTest]);
            verifier('Profil de la pharmacie créée',
                ($r['json']['data']['code_pharmacie'] ?? '') === $codePharmacieTest,
                json_encode($r['json'], JSON_UNESCAPED_UNICODE));
            verifier('Assurances de la pharmacie créée',
                in_array('CNPS', $r['json']['data']['assurance_acceptees'] ?? [], true),
                json_encode($r['json']['data']['assurance_acceptees'] ?? null));
        }

        // Double inscription avec le même numéro -> refus.
        $r = requete('POST', '/api/utilisateur/inscription', [
            'nomUtilisateur'      => 'TEST',
            'prenomUtilisateur'   => 'ApiSmoke',
            'numeroUtilisateur'   => $numeroTest,
            'codePinUtilisateur'  => '991122',
            'type_utilisateur'    => 'Gestionnaire de pharmacie',
            'assuranceUtilisateur' => '',
            'adresseUtilisateur'  => 'Quartier de test',
            'ville_utilisateur'   => 'Abidjan',
        ]);
        verifier('Numéro déjà utilisé refusé', $r['statut'] === 409, (string) $r['statut']);
    }
} catch (Throwable $e) {
    verifier('Exécution', false, $e->getMessage());
} finally {
    executer_nettoyage();
}

$echecs = array_filter($controles, fn ($c) => !$c['ok']);
foreach ($controles as $c) {
    printf("%s %s%s\n", $c['ok'] ? 'OK  ' : 'ECHEC', $c['libelle'], $c['detail'] ? ' [' . $c['detail'] . ']' : '');
}
printf("\n%d/%d contrôles réussis\n", count($controles) - count($echecs), count($controles));
exit(count($echecs) ? 1 : 0);
