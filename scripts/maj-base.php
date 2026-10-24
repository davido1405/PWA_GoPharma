<?php
/**
 * Mise à jour de la base locale (WAMP) à partir du dump assurappci.sql.
 *
 *     php scripts/maj-base.php
 *
 * Opération idempotente : on ne crée que ce qui manque.
 *  - table      `envoi_newsletter`  (suivi des envois newsletter)
 *  - vue        `vue_statistiques_pharmacie`
 *  - index      idx_annonce_date, idx_historique_vue_*, idx_newsletter_date,
 *               idx_vues_pharmacie_date, idx_envoi_pharmacie_date
 *  - contrainte envoi_newsletter_ibfk_1
 */

declare(strict_types=1);

require __DIR__ . '/../config/app.php';

const DUMP = 'D:/Téléchargements/assurappci.sql';

$messages = [];
$erreur = null;

function table_existe(PDO $pdo, string $table): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ? AND table_name = ?'
    );
    $stmt->execute([BDD_NOM, $table]);
    return (bool) $stmt->fetchColumn();
}

function index_existe(PDO $pdo, string $table, string $index): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ?'
    );
    $stmt->execute([BDD_NOM, $table, $index]);
    return (bool) $stmt->fetchColumn();
}

function contrainte_existe(PDO $pdo, string $table, string $contrainte): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = ? AND table_name = ? AND constraint_name = ?'
    );
    $stmt->execute([BDD_NOM, $table, $contrainte]);
    return (bool) $stmt->fetchColumn();
}

function extraction(string $sql, string $debut, ?string $suite = null): ?string
{
    $pos = strpos($sql, $debut);
    if ($pos === false) {
        return null;
    }
    $reste = substr($sql, $pos);
    if ($suite !== null) {
        $fin = strpos($reste, $suite);
        if ($fin === false) {
            return null;
        }
        $reste = substr($reste, 0, $fin + strlen($suite));
    } else {
        $fin = strpos($reste, ';');
        $reste = $fin === false ? $reste : substr($reste, 0, $fin + 1);
    }
    return $reste;
}

try {
    $pdo = new PDO(
        sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', BDD_HOST, BDD_PORT, BDD_NOM),
        BDD_USER,
        BDD_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    if (!is_file(DUMP)) {
        throw new RuntimeException('Dump introuvable : ' . DUMP);
    }
    $sql = file_get_contents(DUMP);
    if ($sql === false) {
        throw new RuntimeException('Lecture du dump impossible.');
    }

    /* 1. Table envoi_newsletter ---------------------------------------- */
    if (!table_existe($pdo, 'envoi_newsletter')) {
        $creation = extraction($sql, 'CREATE TABLE IF NOT EXISTS `envoi_newsletter`');
        if ($creation) {
            $pdo->exec('DROP TABLE IF EXISTS `envoi_newsletter`');
            $pdo->exec($creation);
            $messages[] = 'Table envoi_newsletter créée.';
        } else {
            throw new RuntimeException('Bloc CREATE envoi_newsletter introuvable dans le dump.');
        }
    } else {
        $messages[] = 'Table envoi_newsletter : déjà présente.';
    }

    $nbEnvoyes = (int) $pdo->query('SELECT COUNT(*) FROM envoi_newsletter')->fetchColumn();
    if ($nbEnvoyes === 0) {
        $insertion = extraction($sql, 'INSERT INTO `envoi_newsletter`');
        if ($insertion) {
            $pdo->exec($insertion);
            $messages[] = 'Exemples d\'envois insérés.';
        }
    }

    /* 2. Index manquants ------------------------------------------------ */
    $index = [
        ['annonce', 'idx_annonce_date', '`date_publication`'],
        ['historique_vue', 'idx_historique_vue_date', '`date_vue`'],
        ['historique_vue', 'idx_historique_vue_annonce', '`id_annonce`,`date_vue`'],
        ['newsletter', 'idx_newsletter_date', '`date_abonnement`'],
        ['vues_pharmacie', 'idx_vues_pharmacie_date', '`code_pharmacie`,`date_vue`'],
        ['envoi_newsletter', 'idx_envoi_pharmacie_date', '`code_pharmacie`,`date_envoi`'],
    ];

    foreach ($index as [$table, $nom, $colonnes]) {
        if (!table_existe($pdo, $table)) {
            $messages[] = "Index $nom : table $table absente (ignoré).";
            continue;
        }
        if (index_existe($pdo, $table, $nom)) {
            $messages[] = "Index $nom : déjà présent.";
            continue;
        }
        $pdo->exec("ALTER TABLE `$table` ADD KEY `$nom` ($colonnes)");
        $messages[] = "Index $nom ajouté sur $table.";
    }

    /* 3. Vue de statistiques ------------------------------------------- */
    $vue = extraction($sql, 'CREATE OR REPLACE VIEW `vue_statistiques_pharmacie` AS');
    if (!$vue) {
        throw new RuntimeException('Définition de vue_statistiques_pharmacie introuvable.');
    }
    $pdo->exec($vue);
    $messages[] = 'Vue vue_statistiques_pharmacie (re)créée.';

    /* 4. Contrainte étrangère ------------------------------------------ */
    if (table_existe($pdo, 'envoi_newsletter') && !contrainte_existe($pdo, 'envoi_newsletter', 'envoi_newsletter_ibfk_1')) {
        try {
            $pdo->exec('ALTER TABLE envoi_newsletter ADD CONSTRAINT `envoi_newsletter_ibfk_1`
                        FOREIGN KEY (`code_pharmacie`) REFERENCES `pharmacie` (`code_pharmacie`)
                        ON DELETE CASCADE ON UPDATE CASCADE');
            $messages[] = 'Contrainte envoi_newsletter_ibfk_1 ajoutée.';
        } catch (PDOException $e) {
            $messages[] = 'Contrainte non ajoutée : ' . $e->getMessage();
        }
    } else {
        $messages[] = 'Contrainte envoi_newsletter_ibfk_1 : déjà présente.';
    }

    /* Bilan ------------------------------------------------------------- */
    $nbTables = (int) $pdo->query(
        'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ' . $pdo->quote(BDD_NOM)
    )->fetchColumn();
    $nbVues = (int) $pdo->query(
        'SELECT COUNT(*) FROM information_schema.views WHERE table_schema = ' . $pdo->quote(BDD_NOM)
    )->fetchColumn();

    echo "Base `" . BDD_NOM . "` à jour\n";
    echo str_repeat('-', 60) . "\n";
    foreach ($messages as $m) {
        echo ' - ' . $m . "\n";
    }
    echo str_repeat('-', 60) . "\n";
    echo "Tables : $nbTables | Vues : $nbVues\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'ERREUR : ' . $e->getMessage() . "\n");
    exit(1);
}
