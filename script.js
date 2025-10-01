document.addEventListener('DOMContentLoaded', () => {
    // Sélection des éléments DOM
    const photoGrid = document.getElementById('photoGrid');
    console.log("photoGrid:", photoGrid); // Vérifie si photoGrid est trouvé

    const filterButtons = document.querySelectorAll('.filter-btn');
    console.log("filterButtons (nombre):", filterButtons.length); // Vérifie si les boutons de filtre sont trouvés

    const searchInput = document.getElementById('searchInput');
    console.log("searchInput:", searchInput); // Vérifie si searchInput est trouvé

    const searchButton = document.getElementById('searchButton');
    console.log("searchButton:", searchButton); // Vérifie si searchButton est trouvé

    const carouselModal = document.getElementById('carouselModal');
    console.log("carouselModal:", carouselModal); // VÉRIFIEZ CECI EN PREMIER !

    // Si carouselModal est null, les lignes suivantes vont échouer
    let closeButton = null;
    let carouselTrack = null;
    let prevButton = null;
    let nextButton = null;

    if (carouselModal) {
        closeButton = carouselModal.querySelector('.close-button');
        console.log("closeButton:", closeButton); // Vérifie si closeButton est trouvé
        carouselTrack = carouselModal.querySelector('.carousel-track');
        console.log("carouselTrack:", carouselTrack); // Vérifie si carouselTrack est trouvé
        prevButton = carouselModal.querySelector('.carousel-nav.prev');
        console.log("prevButton:", prevButton); // VÉRIFIEZ CECI !
        nextButton = carouselModal.querySelector('.carousel-nav.next');
        console.log("nextButton:", nextButton); // VÉRIFIEZ CECI !
    } else {
        console.error("ERREUR: L'élément #carouselModal n'a pas été trouvé dans le DOM.");
    }

    // Variables d'état
    let currentSlideIndex = 0;
    let photosData = []; // Ce tableau sera rempli par les données du script PHP
    let currentCarouselPhotos = []; // Contient les photos du carrousel actuellement ouvert (celles du même groupe)

    // --- Fonction pour charger les photos depuis le backend PHP ---
    const loadPhotosFromBackend = async () => {
        console.log("Tentative de chargement des photos depuis generate_gallery_data.php...");
        try {
            // L'URL pointe vers votre script PHP qui génère les données de la galerie.
            // Si votre site est sur un hébergeur, remplacez 'generate_gallery_data.php' par l'URL complète
            // (ex: 'https://votredomaine.com/generate_gallery_data.php').
            // Assurez-vous que cette URL est HTTPS si votre page est en HTTPS.
            const response = await fetch('https://mesphotosparmoi.byethost31.com/generate_gallery_data.php');
            console.log("Réponse Fetch reçue:", response);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}. Réponse du serveur: ${errorText}`);
            }

            const data = await response.json();
            console.log("Données des photos reçues par JS (JSON parsé):", data);

            if (data.error) {
                console.error("Erreur du backend:", data.error);
                photoGrid.innerHTML = '<p>Désolé, impossible de charger les photos pour le moment.</p>';
                return;
            }

            if (!Array.isArray(data)) {
                console.error("Les données reçues ne sont pas un tableau:", data);
                photoGrid.innerHTML = '<p>Format de données inattendu reçu du serveur.</p>';
                return;
            }

            photosData = data.map(photo => ({
                ...photo,
                id: parseInt(photo.id),
                displayInGrid: typeof photo.displayInGrid === 'boolean' ? photo.displayInGrid : (photo.displayInGrid === 'true' || photo.displayInGrid === 1)
            }));
            console.log("photosData après mapping:", photosData);

            // Initialise l'affichage de la galerie avec les photos chargées
            renderPhotos(photosData);

        } catch (error) {
            console.error("Erreur lors du chargement des photos:", error);
            photoGrid.innerHTML = '<p>Désolé, une erreur est survenue lors du chargement des photos.</p>';
        }
    };

    // --- Fonctions principales de la galerie ---

    /**
     * Rend (affiche) les photos dans la grille principale de la galerie.
     * Filtre pour n'afficher que les photos avec displayInGrid: true.
     * @param {Array<Object>} photosToDisplay - Les photos à afficher.
     */
    const renderPhotos = (photosToDisplay) => {
        console.log("Début du rendu des photos. Nombre de photos à afficher:", photosToDisplay.length);
        photoGrid.innerHTML = ''; // Vide la grille actuelle

        // Ne sélectionne que les photos marquées comme visibles dans la grille principale
        const photosForGrid = photosToDisplay.filter(photo => photo.displayInGrid);
        console.log("Photos filtrées pour la grille (displayInGrid: true):", photosForGrid.length);

        // Affiche un message si aucune photo n'est visible dans la grille
        if (photosForGrid.length === 0 && (filterButtons[0].classList.contains('active') || searchInput.value === '')) {
            photoGrid.innerHTML = '<p>Aucune photo visible dans la galerie principale.</p>';
            console.warn("Aucune photo à afficher dans la grille.");
            return;
        }

        // Crée et ajoute les éléments HTML pour chaque photo visible
        photosForGrid.forEach(photo => {
            // console.log("Création de l'élément photo pour:", photo.src); // Décommenter pour un débogage très détaillé
            const photoItem = document.createElement('div');
            photoItem.classList.add('photo-item');
            photoItem.setAttribute('data-id', photo.id);
            photoItem.setAttribute('data-theme', photo.theme);

            // Assurez-vous que photo.thumb est un chemin valide
            if (photo.thumb) {
                photoItem.innerHTML = `
                    <img src="${photo.thumb}" alt="${photo.title || 'Image de la galerie'}">
                    <div class="photo-info">
                        <h3>${photo.title}</h3>
                        <p>${photo.description}</p>
                    </div>
                `;
            } else {
                console.warn(`Photo avec ID ${photo.id} a un chemin thumb vide.`);
                photoItem.innerHTML = `<p>Image manquante</p>`;
            }
            photoGrid.appendChild(photoItem);

            // Attache l'écouteur d'événement pour ouvrir le carrousel du groupe
            photoItem.addEventListener('click', () => openCarousel(photo.id, photo.groupId));
        });
    };

    /**
     * Gère le filtrage des photos par thème (boutons "Tout", "Mix", "Animaux", "Ville").
     * Le filtrage s'applique à l'ensemble des photos chargées, mais `renderPhotos` n'affichera que celles avec `displayInGrid: true`.
     */
    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Gère l'état actif des boutons de filtre
            filterButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            const theme = e.target.dataset.theme;
            console.log("Filtre appliqué:", theme);
            // Filtre les photos par thème. Si 'all', toutes les photos sont passées.
            const filteredByTheme = theme === 'all' ? photosData : photosData.filter(photo => photo.theme === theme);
            // `renderPhotos` s'occupera ensuite de filtrer par `displayInGrid`
            renderPhotos(filteredByTheme);
        });
    });

    /**
     * Effectue une recherche dans les photos par titre, description ou thème.
     * La recherche s'applique uniquement aux photos visibles dans la grille (celles avec `displayInGrid: true`).
     */
    const performSearch = () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        console.log("Recherche lancée pour:", searchTerm);
        // Filtre d'abord les photos qui DOIVENT être visibles dans la grille, puis applique la recherche
        const photosVisibleInGrid = photosData.filter(photo => photo.displayInGrid);
        const searchResults = photosVisibleInGrid.filter(photo =>
            photo.title.toLowerCase().includes(searchTerm) ||
            photo.description.toLowerCase().includes(searchTerm) ||
            photo.theme.toLowerCase().includes(searchTerm)
        );
        photoGrid.innerHTML = ''; // Efface la grille actuelle

        // Affiche un message si aucun résultat n'est trouvé pour la recherche
        if (searchResults.length === 0 && searchTerm !== '') {
            photoGrid.innerHTML = '<p>Aucune photo trouvée pour votre recherche.</p>';
            console.warn("Aucun résultat de recherche.");
            return;
        }

        // Crée et ajoute les éléments HTML pour les résultats de la recherche
        searchResults.forEach(photo => {
            const photoItem = document.createElement('div');
            photoItem.classList.add('photo-item');
            photoItem.setAttribute('data-id', photo.id);
            photoItem.setAttribute('data-theme', photo.theme);

            if (photo.thumb) {
                photoItem.innerHTML = `
                    <img src="${photo.thumb}" alt="${photo.title || 'Image de la galerie'}">
                    <div class="photo-info">
                        <h3>${photo.title}</h3>
                        <p>${photo.description}</p>
                    </div>
                `;
            } else {
                console.warn(`Photo avec ID ${photo.id} a un chemin thumb vide lors de la recherche.`);
                photoItem.innerHTML = `<p>Image manquante</p>`;
            }
            photoGrid.appendChild(photoItem);
            photoItem.addEventListener('click', () => openCarousel(photo.id, photo.groupId));
        });
    };

    // Écouteurs d'événements pour la barre de recherche
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') { // Déclenche la recherche avec la touche Entrée
            performSearch();
        } else if (searchInput.value.trim() === '') {
            console.log("Champ de recherche vide, réaffichage de toutes les photos visibles.");
            // Si la barre de recherche est vide, on réaffiche les photos par défaut
            renderPhotos(photosData);
        }
    });

    // --- Fonctions du carrousel ---

    /**
     * Ouvre la modale du carrousel et charge toutes les photos du même groupe.
     * Le carrousel inclut TOUTES les photos du groupe, même celles masquées de la grille principale.
     * @param {number} startPhotoId - L'ID de la photo sur laquelle on a cliqué.
     * @param {string} groupId - L'ID du groupe à afficher dans le carrousel.
     */
    const openCarousel = (startPhotoId, groupId) => {
        console.log(`Ouverture du carrousel. Photo de départ: ${startPhotoId}, Groupe: ${groupId}.`);
        carouselTrack.innerHTML = ''; // Vide le contenu du carrousel

        // Filtre toutes les photos pour ne garder que celles qui ont le même groupId
        currentCarouselPhotos = photosData.filter(photo => photo.groupId === groupId);
        console.log("Photos pour le carrousel:", currentCarouselPhotos);

        // Trouve l'index de la photo de départ dans ce nouveau tableau filtré
        const startIndex = currentCarouselPhotos.findIndex(photo => photo.id === startPhotoId);

        if (currentCarouselPhotos.length === 0) {
            console.warn("Aucune photo trouvée pour le carrousel avec ce groupe.");
            return;
        }

        // Ajoute les images filtrées au carrousel
        currentCarouselPhotos.forEach(photo => {
            const carouselItem = document.createElement('div');
            carouselItem.classList.add('carousel-item');
            carouselItem.setAttribute('data-id', photo.id);
            if (photo.src) {
                carouselItem.innerHTML = `<img src="${photo.src}" alt="${photo.title || 'Image du carrousel'}">`;
            } else {
                console.warn(`Photo ID ${photo.id} a un chemin src vide dans le carrousel.`);
                carouselItem.innerHTML = `<p>Image manquante</p>`;
            }
            carouselTrack.appendChild(carouselItem);
        });

        // Définit l'index de départ du carrousel
        currentSlideIndex = startIndex !== -1 ? startIndex : 0;
        updateCarousel(); // Met à jour l'affichage du carrousel
        carouselModal.style.display = 'flex'; // Affiche la modale
    };

    /**
     * Met à jour la position du carrousel.
     */
    const updateCarousel = () => {
        console.log("Mise à jour de la position du carrousel.");
        // S'assure qu'il y a des éléments avant d'essayer d'accéder à leur largeur
        if (carouselTrack.children.length === 0) {
            console.warn("Le carrousel n'a pas d'éléments à afficher.");
            return;
        }
        const itemWidth = carouselTrack.children[0].clientWidth; // Largeur d'une image de carrousel
        carouselTrack.style.transform = `translateX(-${currentSlideIndex * itemWidth}px)`;
        console.log(`Carrousel positionné à index ${currentSlideIndex}, largeur item: ${itemWidth}.`);
    };

    // Gestion de la navigation entre les images du carrousel
    // Ces écouteurs sont attachés ici, donc si les éléments sont null, l'erreur se produit.
    if (prevButton) { // Ajout d'une vérification ici
        prevButton.addEventListener('click', () => {
            currentSlideIndex = (currentSlideIndex > 0) ? currentSlideIndex - 1 : currentCarouselPhotos.length - 1;
            updateCarousel();
        });
    } else {
        console.error("prevButton est null. Impossible d'attacher l'écouteur d'événement.");
    }

    if (nextButton) { // Ajout d'une vérification ici
        nextButton.addEventListener('click', () => {
            currentSlideIndex = (currentSlideIndex < currentCarouselPhotos.length - 1) ? currentSlideIndex + 1 : 0;
            updateCarousel();
        });
    } else {
        console.error("nextButton est null. Impossible d'attacher l'écouteur d'événement.");
    }

    // Gestion de la fermeture de la modale du carrousel
    if (closeButton) { // Ajout d'une vérification ici
        closeButton.addEventListener('click', () => {
            carouselModal.style.display = 'none';
            console.log("Modale fermée.");
        });
    } else {
        console.error("closeButton est null. Impossible d'attacher l'écouteur d'événement.");
    }

    if (carouselModal) { // Vérification pour l'écouteur window click
        window.addEventListener('click', (event) => {
            if (event.target === carouselModal) {
                carouselModal.style.display = 'none';
                console.log("Modale fermée via clic extérieur.");
            }
        });
    }


    // --- Initialisation de la galerie au chargement de la page ---
    // C'est ici que le chargement des photos depuis le backend est initié.
    loadPhotosFromBackend();
});
