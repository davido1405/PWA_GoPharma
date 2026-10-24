<?php
/* Nettoyage du compte de test créé par api-smoke.php lors d'une exécution interrompue. */
require __DIR__ . '/../api/bootstrap.php';

$pdo = db();

$codes = $pdo->query(
    "SELECT code_utilisateur FROM utilisateurs WHERE numeros_utilisateur = '+2250700000991'"
)->fetchAll(PDO::FETCH_COLUMN);

foreach ($codes as $qCode) {
    $q = $pdo->quote($qCode);
    $pharmacies = $pdo->query(
        'SELECT code_pharmacie FROM utilisateur_gerant WHERE code_utilisateur = ' . $q
    )->fetchAll(PDO::FETCH_COLUMN);

    foreach ($pharmacies as $qPharma) {
        $qp = $pdo->quote($qPharma);
        foreach ([
            'pharmacie_assurance', 'horaires_ouverture', 'envoi_newsletter', 'newsletter',
            'annonce', 'notifications', 'vues_pharmacie', 'historique_vue',
        ] as $table) {
            try {
                $pdo->exec("DELETE FROM `$table` WHERE code_pharmacie = $qp");
            } catch (Throwable $e) {
                echo "  ({$table}) " . $e->getMessage() . "\n";
            }
        }
        $idAdresse = $pdo->query(
            'SELECT id_adresse FROM pharmacie WHERE code_pharmacie = ' . $qp
        )->fetchColumn();
        $pdo->exec('DELETE FROM utilisateur_gerant WHERE code_pharmacie = ' . $qp);
        $pdo->exec('DELETE FROM pharmacie WHERE code_pharmacie = ' . $qp);
        if ($idAdresse) {
            $pdo->exec('DELETE FROM adresse_pharmacie WHERE id_adresse = ' . (int) $idAdresse);
        }
    }

    $pdo->exec('DELETE FROM utilisateur_gerant WHERE code_utilisateur = ' . $q);
    $pdo->exec('DELETE FROM utilisateur_assurance WHERE code_utilisateur = ' . $q);
    $pdo->exec('UPDATE utilisateurs SET id_adresse = NULL WHERE code_utilisateur = ' . $q);
    $pdo->exec('DELETE FROM adresse_utilisateur WHERE code_utilisateur = ' . $q);
    $pdo->exec('DELETE FROM utilisateurs WHERE code_utilisateur = ' . $q);
    echo "Compte supprimé : $qCode\n";
}

if (!$codes) {
    echo "Aucun compte de test à supprimer.\n";
}
