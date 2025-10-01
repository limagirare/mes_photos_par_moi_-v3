<?php
// generate_aviron_data.php
// Scanne img/aviron_events/* et renvoie un tableau JSON d'événements

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Pour développement, retirez en production si nécessaire

$eventsData = [];
$photoIdCounter = 1;

$avironEventsPath = 'img/aviron_events/';
// Cherche dossiers d'événements
$eventDirectories = glob($avironEventsPath . '*', GLOB_ONLYDIR);

foreach ($eventDirectories as $eventDir) {
    $metadataFile = rtrim($eventDir, '/') . '/metadata.json';
    $eventFolderName = basename($eventDir);

    if (file_exists($metadataFile)) {
        $metadataContent = file_get_contents($metadataFile);
        $eventMetadata = json_decode($metadataContent, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("Erreur de décodage JSON dans $metadataFile : " . json_last_error_msg());
            continue;
        }

        $eventId = $eventMetadata['eventId'] ?? $eventFolderName;
        $eventName = $eventMetadata['eventName'] ?? ucfirst(str_replace('_', ' ', $eventFolderName));
        $eventDescription = $eventMetadata['eventDescription'] ?? '';

        $eventPhotos = [];
        if (isset($eventMetadata['photos']) && is_array($eventMetadata['photos'])) {
            foreach ($eventMetadata['photos'] as $imageData) {
                $filename = $imageData['filename'] ?? null;
                // Construire le chemin relatif accessible par le web
                $fullImagePath = $eventDir . '/' . $filename;

                if ($filename && file_exists($fullImagePath)) {
                    $photo = [
                        'id' => $photoIdCounter++,
                        'src' => $fullImagePath,
                        'thumb' => $fullImagePath,
                        'title' => $imageData['title'] ?? 'Titre inconnu',
                        'description' => $imageData['description'] ?? '',
                        'groupId' => $imageData['groupId'] ?? ($eventId . '_default_group'),
                        'orientation' => $imageData['orientation'] ?? null
                    ];
                    $eventPhotos[] = $photo;
                } else {
                    error_log("Fichier image manquant ou non spécifié dans $eventDir : " . ($filename ?? 'N/A'));
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
        error_log("Fichier metadata.json manquant pour l'événement : $eventDir");
    }
}

// Renvoie le JSON avec slashes non échappés (plus lisible pour URLs)
echo json_encode($eventsData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
?>
