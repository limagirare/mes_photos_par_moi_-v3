<?php
header('Content-Type: application/json'); // Indique que la réponse est du JSON
header('Access-Control-Allow-Origin: *'); // Autorise les requêtes de n'importe quel domaine (pour le développement)

$galleryData = [];
$photoIdCounter = 1; // Compteur pour attribuer des IDs uniques aux photos

// Chemin vers le dossier racine des images
$imageRootPath = 'img/';

// Scan des dossiers de groupes de photos
$groupDirectories = glob($imageRootPath . '*', GLOB_ONLYDIR);

foreach ($groupDirectories as $groupDir) {
    $metadataFile = $groupDir . '/metadata.json';
    $groupName = basename($groupDir); // Nom du dossier = nom du groupe

    if (file_exists($metadataFile)) {
        $metadataContent = file_get_contents($metadataFile);
        $groupMetadata = json_decode($metadataContent, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("Erreur de décodage JSON dans " . $metadataFile . ": " . json_last_error_msg());
            continue; // Passe au dossier suivant si le JSON est invalide
        }

        $baseGroupId = $groupMetadata['groupId'] ?? $groupName;
        $baseTheme = $groupMetadata['theme'] ?? 'general';
        $baseDisplayInGrid = $groupMetadata['defaultDisplayInGrid'] ?? true; // Par défaut visible

        if (isset($groupMetadata['images']) && is_array($groupMetadata['images'])) {
            foreach ($groupMetadata['images'] as $imageData) {
                $filename = $imageData['filename'] ?? null;
                if ($filename && file_exists($groupDir . '/' . $filename)) {
                    $photo = [
                        'id' => $photoIdCounter++,
                        'src' => $groupDir . '/' . $filename,
                        'thumb' => $groupDir . '/' . $filename, // Pour l'instant, thumb est le même que src
                        'title' => $imageData['title'] ?? 'Titre inconnu',
                        'description' => $imageData['description'] ?? '',
                        'theme' => $imageData['theme'] ?? $baseTheme, // Peut être surchargé par image
                        'groupId' => $imageData['groupId'] ?? $baseGroupId, // Peut être surchargé par image
                        'displayInGrid' => $imageData['displayInGrid'] ?? $baseDisplayInGrid // Peut être surchargé par image
                    ];
                    $galleryData[] = $photo;
                } else {
                    error_log("Fichier image manquant ou non spécifié dans " . $groupDir . ": " . ($filename ?? 'N/A'));
                }
            }
        }
    } else {
        // Gère les images qui ne sont pas dans un dossier avec metadata.json (ex: 'zebre.jpg')
        // Ou les dossiers sans metadata.json (si vous voulez les ignorer)
        // Pour l'exemple, nous allons juste les ignorer pour l'instant,
        // ou vous pourriez ajouter une logique pour les photos "indépendantes" ici.
        // Par exemple, si vous avez des photos directement dans 'img/'
        // qui ne sont pas dans des sous-dossiers de groupe.
    }
}

// --- Gérer les photos directement dans le dossier img/ (photos "indépendantes") ---
// Cela est utile si vous avez des images qui ne font pas partie d'un carrousel de groupe.
$independentImages = glob($imageRootPath . '*.{jpg,jpeg,png,gif}', GLOB_BRACE);
foreach ($independentImages as $imagePath) {
    $filename = basename($imagePath);
    // Vous devrez définir comment gérer les métadonnées pour ces images indépendantes.
    // Pour cet exemple, nous allons leur donner des valeurs par défaut.
    // Idéalement, elles auraient aussi un fichier metadata.json dans un dossier dédié ou une convention de nommage.
    $photo = [
        'id' => $photoIdCounter++,
        'src' => $imagePath,
        'thumb' => $imagePath,
        'title' => '' . pathinfo($filename, PATHINFO_FILENAME),
        'description' => '',
        'theme' => 'mix', // Thème par défaut
        'groupId' => 'independant_'.pathinfo($filename, PATHINFO_FILENAME), // Chaque indépendante a son propre groupe
        'displayInGrid' => true // Visible dans la grille par défaut
    ];
    $galleryData[] = $photo;
}


echo json_encode($galleryData);
?>
