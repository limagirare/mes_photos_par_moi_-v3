<?php
header('Content-Type: application/json'); // Indique que la réponse est du JSON
header('Access-Control-Allow-Origin: *'); // Autorise les requêtes de n'importe quel domaine (pour le développement)

$eventsData = [];
$photoIdCounter = 1; // Compteur pour attribuer des IDs uniques aux photos

// Chemin vers le dossier racine des événements d'aviron
$avironEventsPath = 'img/aviron_events/';

// Scan des dossiers d'événements d'aviron
$eventDirectories = glob($avironEventsPath . '*', GLOB_ONLYDIR);

foreach ($eventDirectories as $eventDir) {
    $metadataFile = $eventDir . '/metadata.json';
    $eventFolderName = basename($eventDir); // Nom du dossier de l'événement

    if (file_exists($metadataFile)) {
        $metadataContent = file_get_contents($metadataFile);
        $eventMetadata = json_decode($metadataContent, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("Erreur de décodage JSON dans " . $metadataFile . ": " . json_last_error_msg());
            continue; // Passe au dossier d'événement suivant si le JSON est invalide
        }

        $eventId = $eventMetadata['eventId'] ?? $eventFolderName;
        $eventName = $eventMetadata['eventName'] ?? ucfirst(str_replace('_', ' ', $eventFolderName));
        $eventDescription = $eventMetadata['eventDescription'] ?? '';

        $eventPhotos = [];
        if (isset($eventMetadata['photos']) && is_array($eventMetadata['photos'])) {
            foreach ($eventMetadata['photos'] as $imageData) {
                $filename = $imageData['filename'] ?? null;
                $fullImagePath = $eventDir . '/' . $filename;

                if ($filename && file_exists($fullImagePath)) {
                    
                    // --- LA LOGIQUE D'ORIENTATION ET DIMENSIONS A ÉTÉ RETIRÉE ---
                    
                    $photo = [
                        'id' => $photoIdCounter++,
                        'src' => $fullImagePath,
                        'thumb' => $fullImagePath, // Pour l'instant, thumb est le même que src
                        'title' => $imageData['title'] ?? 'Titre inconnu',
                        'description' => $imageData['description'] ?? '',
                        'groupId' => $imageData['groupId'] ?? $eventId . '_default_group' // Groupe par défaut
                        // Les champs 'orientation', 'width', et 'height' ne sont plus inclus
                    ];
                    $eventPhotos[] = $photo;
                } else {
                    error_log("Fichier image manquant ou non spécifié dans " . $eventDir . ": " . ($filename ?? 'N/A'));
                }
            }
        }

        if (!empty($eventPhotos)) {
            $eventsData[] = [
                'eventId' => $eventId,
                'eventName' => $eventName,
                'eventDescription' => $eventDescription,
                'photos' => $eventPhotos
            ];
        }

    } else {
        error_log("Fichier metadata.json manquant pour l'événement : " . $eventDir);
    }
}

echo json_encode($eventsData);
?>
