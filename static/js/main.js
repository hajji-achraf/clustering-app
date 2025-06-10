/**
 * ClusterViz - Application de visualisation de clustering
 * Développé par Hajji Achraf
 */

// Variables globales
let rawData = null;
let columns = [];
let numericColumns = [];
let currentPlot = false;
let currentDendrogram = false;

// Éléments DOM
const fileInput = document.getElementById('file-input');
const generateSampleBtn = document.getElementById('generate-sample-btn');
const dataPreview = document.getElementById('data-preview');
const dataCountBadge = document.getElementById('data-count-badge');
const previewTable = document.getElementById('preview-table');
const clusteringOptions = document.getElementById('clustering-options');
const dimensionX = document.getElementById('dimension-x');
const dimensionY = document.getElementById('dimension-y');
const kmeansRadio = document.getElementById('kmeans');
const hierarchicalRadio = document.getElementById('hierarchical');
const kmeansOptions = document.getElementById('kmeans-options');
const hierarchicalOptions = document.getElementById('hierarchical-options');
const nClusters = document.getElementById('n-clusters');
const findOptimalK = document.getElementById('find-optimal-k');
const distanceMetric = document.getElementById('distance-metric');
const linkageMethod = document.getElementById('linkage-method');
const runClusteringBtn = document.getElementById('run-clustering');
const loadingIndicator = document.getElementById('loading');
const welcomeMessage = document.getElementById('welcome-message');
const plotArea = document.getElementById('plot-area');
const plotContainer = document.getElementById('plot-container');
const dendrogramArea = document.getElementById('dendrogram-area');
const dendrogramContainer = document.getElementById('dendrogram-container');
const viewControls = document.getElementById('view-controls');
const viewPlotBtn = document.getElementById('view-plot');
const viewDendrogramBtn = document.getElementById('view-dendrogram');
const resultsCard = document.getElementById('results-card');
const clusterStats = document.getElementById('cluster-stats');
const helpBtn = document.getElementById('help-btn');
const aboutBtn = document.getElementById('about-btn');

// Fonction pour mettre à jour le guide des étapes
function updateProgressStepper(activeStepNumber) {
    // Récupérer tous les éléments d'étapes
    const steps = document.querySelectorAll('.progress-stepper .step');
    
    // Mettre à jour les classes pour chaque étape
    steps.forEach((step, index) => {
        const stepNumber = index + 1;
        
        // Supprimer les classes existantes
        step.classList.remove('active', 'completed');
        
        // Ajouter les classes appropriées en fonction de l'étape active
        if (stepNumber < activeStepNumber) {
            step.classList.add('completed');
        } else if (stepNumber === activeStepNumber) {
            step.classList.add('active');
        }
    });
    
    // Mettre à jour les lignes de connexion
    const stepLines = document.querySelectorAll('.step-line');
    stepLines.forEach((line, index) => {
        if (index < activeStepNumber - 1) {
            line.classList.add('completed');
        } else {
            line.classList.remove('completed');
        }
    });
}

// Gestionnaires d'événements
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Initialiser le stepper à l'étape 1 (Import des données)
    updateProgressStepper(1);
    
    // Configuration du drag & drop pour l'upload de fichier
    setupDragAndDrop();
    
    // Gestionnaires d'événements
    fileInput.addEventListener('change', handleFileUpload);
    generateSampleBtn.addEventListener('click', generateSample);
    kmeansRadio.addEventListener('change', toggleClusteringOptions);
    hierarchicalRadio.addEventListener('change', toggleClusteringOptions);
    findOptimalK.addEventListener('click', findOptimalKValue);
    runClusteringBtn.addEventListener('click', runClustering);
    viewPlotBtn.addEventListener('click', () => switchView('plot'));
    viewDendrogramBtn.addEventListener('click', () => switchView('dendrogram'));
    
    // Événements des modals
    helpBtn.addEventListener('click', showGuideModal);
    aboutBtn.addEventListener('click', showAboutModal);
    
    // Animation de bienvenue
    animateWelcome();
}

// Animation de bienvenue
function animateWelcome() {
    welcomeMessage.style.opacity = '0';
    welcomeMessage.style.transform = 'translateY(20px)';
    welcomeMessage.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    
    setTimeout(() => {
        welcomeMessage.style.opacity = '1';
        welcomeMessage.style.transform = 'translateY(0)';
    }, 300);
}

// Configuration du drag & drop
function setupDragAndDrop() {
    const dropArea = document.getElementById('file-upload-area');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.add('drag-active');
        });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.remove('drag-active');
        });
    });
    
    dropArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length) {
            fileInput.files = files;
            handleFileUpload({ target: { files: files } });
        }
    });
}

// Afficher le modal du guide
function showGuideModal() {
    const guideModal = new bootstrap.Modal(document.getElementById('guideModal'));
    guideModal.show();
}

// Afficher le modal à propos
function showAboutModal() {
    const aboutModal = new bootstrap.Modal(document.getElementById('aboutModal'));
    aboutModal.show();
}

// Gérer l'upload de fichier
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        showLoading();
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            processData(result);
            showNotification(`Fichier ${file.name} importé avec succès.`, 'success');
        } else {
            showNotification('Erreur: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Erreur lors du chargement du fichier', 'error');
    } finally {
        hideLoading();
    }
}

// Générer un exemple de données
async function generateSample() {
    try {
        showLoading();
        
        const response = await fetch('/api/generate-sample', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            processData(result);
            showNotification('Exemple de données généré avec succès.', 'success');
        } else {
            showNotification('Erreur: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Erreur lors de la génération de l\'exemple', 'error');
    } finally {
        hideLoading();
    }
}

// Traiter les données reçues
function processData(result) {
    rawData = result.data;
    columns = result.columns;
    numericColumns = result.numeric_columns;
    
    // Mettre à jour l'étape active à la configuration (étape 2)
    updateProgressStepper(2);
    
    // Cacher le message de bienvenue
    welcomeMessage.style.display = 'none';
    
    // Afficher un aperçu des données
    showDataPreview();
    
    // Activer les options de clustering
    populateDimensionSelects();
    clusteringOptions.style.display = 'block';
    
    // Animation d'apparition
    clusteringOptions.style.opacity = '0';
    clusteringOptions.style.transform = 'translateY(20px)';
    clusteringOptions.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    
    setTimeout(() => {
        clusteringOptions.style.opacity = '1';
        clusteringOptions.style.transform = 'translateY(0)';
    }, 100);
}

// Afficher l'aperçu des données
function showDataPreview() {
    if (!rawData || rawData.length === 0) return;
    
    // Mettre à jour le badge de comptage
    dataCountBadge.textContent = `${rawData.length} lignes`;
    
    // Construire l'en-tête du tableau
    let tableHTML = '<thead><tr>';
    columns.forEach(col => {
        const isNumeric = numericColumns.includes(col);
        tableHTML += `<th ${isNumeric ? 'class="text-primary"' : ''}>${col} ${isNumeric ? '<i class="fas fa-calculator text-primary small ms-1"></i>' : ''}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    
    // Ajouter les lignes de données (max 5)
    const previewRows = rawData.slice(0, 5);
    previewRows.forEach(row => {
        tableHTML += '<tr>';
        columns.forEach(col => {
            const value = typeof row[col] === 'number' ? row[col].toFixed(4) : row[col];
            tableHTML += `<td>${value}</td>`;
        });
        tableHTML += '</tr>';
    });
    
    if (rawData.length > 5) {
        tableHTML += `<tr class="text-muted"><td colspan="${columns.length}" class="text-center">
            <i class="fas fa-ellipsis-h me-1"></i> ${rawData.length - 5} lignes supplémentaires
        </td></tr>`;
    }
    
    tableHTML += '</tbody>';
    previewTable.innerHTML = tableHTML;
    dataPreview.style.display = 'block';
    
    // Animation
    dataPreview.style.opacity = '0';
    dataPreview.style.transform = 'translateY(20px)';
    dataPreview.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    
    setTimeout(() => {
        dataPreview.style.opacity = '1';
        dataPreview.style.transform = 'translateY(0)';
    }, 100);
}

// Remplir les sélecteurs de dimension
function populateDimensionSelects() {
    dimensionX.innerHTML = '';
    dimensionY.innerHTML = '';
    
    numericColumns.forEach(col => {
        dimensionX.innerHTML += `<option value="${col}">${col}</option>`;
        dimensionY.innerHTML += `<option value="${col}">${col}</option>`;
    });
    
    // Sélectionner la 2ème colonne pour Y si disponible
    if (numericColumns.length > 1) {
        dimensionY.selectedIndex = 1;
    }
}

// Basculer entre les options K-means et hiérarchiques
function toggleClusteringOptions() {
    if (kmeansRadio.checked) {
        kmeansOptions.style.display = 'block';
        hierarchicalOptions.style.display = 'none';
    } else {
        kmeansOptions.style.display = 'none';
        hierarchicalOptions.style.display = 'block';
    }
}

// Basculer entre les vues graphique et dendrogramme
function switchView(view) {
    if (view === 'plot') {
        plotArea.style.display = 'block';
        dendrogramArea.style.display = 'none';
        viewPlotBtn.classList.add('active');
        viewDendrogramBtn.classList.remove('active');
    } else {
        plotArea.style.display = 'none';
        dendrogramArea.style.display = 'block';
        viewPlotBtn.classList.remove('active');
        viewDendrogramBtn.classList.add('active');
    }
}

// Trouver la valeur K optimale
async function findOptimalKValue() {
    if (!rawData || rawData.length === 0) {
        showNotification("Aucune donnée disponible. Veuillez d'abord importer ou générer des données.", 'warning');
        return;
    }
    
    try {
        showLoading();
        
        const selectedFeatures = [dimensionX.value, dimensionY.value];
        
        const response = await fetch('/api/elbow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                data: rawData,
                features: selectedFeatures,
                max_k: 8
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Mettre à jour le nombre de clusters
            nClusters.value = result.optimal_k;
            
            // Tracer le graphique d'elbow avec Plotly
            const trace = {
                x: result.k_values,
                y: result.inertias,
                type: 'scatter',
                mode: 'lines+markers',
                name: 'Inertie',
                line: {
                    color: '#3B3B1A',
                    width: 2
                },
                marker: {
                    size: 8,
                    color: '#3B3B1A'
                }
            };
            
            // Marquer le K optimal
            const optimalPoint = {
                x: [result.optimal_k],
                y: [result.inertias[result.k_values.indexOf(result.optimal_k)]],
                type: 'scatter',
                mode: 'markers',
                name: `K optimal = ${result.optimal_k}`,
                marker: {
                    size: 12,
                    color: '#FF5252',
                    symbol: 'circle'
                }
            };
            
            const layout = {
                title: 'Méthode du coude (Elbow Method)',
                xaxis: {
                    title: 'Nombre de clusters (k)',
                    tickmode: 'array',
                    tickvals: result.k_values
                },
                yaxis: {
                    title: 'Inertie'
                },
                hovermode: 'closest',
                plot_bgcolor: '#f8f8f8',
                paper_bgcolor: '#ffffff'
            };
            
            Plotly.newPlot(plotContainer, [trace, optimalPoint], layout);
            
            plotArea.style.display = 'block';
            welcomeMessage.style.display = 'none';
            
            showNotification(`Nombre optimal de clusters: ${result.optimal_k}`, 'success');
        } else {
            showNotification('Erreur: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Erreur lors du calcul du k optimal', 'error');
    } finally {
        hideLoading();
    }
}

// Exécuter l'algorithme de clustering
async function runClustering() {
    if (!rawData || rawData.length === 0) {
        showNotification("Aucune donnée disponible.", 'warning');
        return;
    }
    
    try {
        showLoading();
        
        const isKMeans = kmeansRadio.checked;
        const endpoint = isKMeans ? '/api/kmeans' : '/api/hierarchical';
        const selectedFeatures = [dimensionX.value, dimensionY.value];
        
        const requestData = {
            data: rawData,
            features: selectedFeatures,
            n_clusters: parseInt(nClusters.value)
        };
        
        if (isKMeans) {
            requestData.distance_metric = distanceMetric.value;
        } else {
            requestData.linkage = linkageMethod.value;
        }
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Mettre à jour l'étape active à l'analyse (étape 3)
            updateProgressStepper(3);
            
            // Couleurs pour les clusters
            const colors = [
                '#FF5252', // Rouge
                '#B2D732', // Jaune-vert
                '#00BCD4', // Bleu cyan
                '#E040FB', // Violet
                '#FF9800', // Orange
                '#4CAF50', // Vert
                '#2196F3'  // Bleu
            ];
            
            // Tracer le nuage de points avec Plotly
            const traces = [];
            const clusters = result.clusters;
            const plotData = result.plot_data;
            
            // Grouper les points par cluster
            const clusterPoints = {};
            for (let i = 0; i < clusters.length; i++) {
                const cluster = clusters[i];
                if (!clusterPoints[cluster]) {
                    clusterPoints[cluster] = { x: [], y: [] };
                }
                clusterPoints[cluster].x.push(plotData[i][0]);
                clusterPoints[cluster].y.push(plotData[i][1]);
            }
            
            // Créer une trace pour chaque cluster
            Object.keys(clusterPoints).forEach((cluster, index) => {
                traces.push({
                    x: clusterPoints[cluster].x,
                    y: clusterPoints[cluster].y,
                    mode: 'markers',
                    type: 'scatter',
                    name: `Cluster ${cluster}`,
                    marker: {
                        color: colors[index % colors.length],
                        size: 8
                    }
                });
            });
            
            // Ajouter les centroïdes pour K-means
            if (isKMeans && result.centroids) {
                traces.push({                    x: result.centroids.map(c => c[0]),
                    y: result.centroids.map(c => c[1]),
                    mode: 'markers',
                    type: 'scatter',
                    name: 'Centroides',
                    marker: {
                        color: 'black',
                        size: 12,
                        symbol: 'x',
                        line: {
                            color: 'white',
                            width: 2
                        }
                    }
                });
            }
            
            const layout = {
                title: isKMeans ? 'K-Means Clustering' : 'Hierarchical Clustering',
                xaxis: { title: selectedFeatures[0] },
                yaxis: { title: selectedFeatures[1] },
                hovermode: 'closest',
                plot_bgcolor: 'rgba(240, 240, 240, 0.5)',
                font: {
                    family: 'Poppins, sans-serif'
                }
            };
            
            Plotly.newPlot(plotContainer, traces, layout);
            
            // Afficher le dendrogramme si disponible
            if (!isKMeans && result.dendrogram_url) {
                // Utiliser une image pour le dendrogramme
                displayDendrogram(null, result);
                viewControls.style.display = 'flex';
                // Par défaut, montrer d'abord le graphique
                switchView('plot');
            } else {
                viewControls.style.display = 'none';
            }
            
            // Afficher les résultats
            welcomeMessage.style.display = 'none';
            plotArea.style.display = 'block';
            
            // Afficher les statistiques des clusters
            showClusterStats(result.stats, colors);
            
            // Montrer les résultats
            resultsCard.style.display = 'block';
            
            // Animation
            resultsCard.style.opacity = '0';
            resultsCard.style.transform = 'translateY(20px)';
            resultsCard.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            
            setTimeout(() => {
                resultsCard.style.opacity = '1';
                resultsCard.style.transform = 'translateY(0)';
            }, 100);
            
            showNotification('Clustering terminé avec succès.', 'success');
        } else {
            showNotification('Erreur: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Erreur lors du clustering', 'error');
    } finally {
        hideLoading();
    }
}

// Afficher le dendrogramme
function displayDendrogram(dendrogramData, result) {
    const dendrogramDiv = document.getElementById('dendrogram-container');
    
    // Si nous avons une image du dendrogramme
    if (result && result.dendrogram_url) {
        dendrogramDiv.innerHTML = `
            <div class="dendro-image-container">
                <img src="${result.dendrogram_url}" class="img-fluid dendro-image" alt="Dendrogramme">
                <div class="dendro-controls">
                    <button class="btn btn-sm btn-light dendro-zoom-in" title="Zoom +">
                        <i class="fas fa-search-plus"></i>
                    </button>
                    <button class="btn btn-sm btn-light dendro-zoom-out" title="Zoom -">
                        <i class="fas fa-search-minus"></i>
                    </button>
                    <button class="btn btn-sm btn-light dendro-reset" title="Réinitialiser">
                        <i class="fas fa-undo"></i>
                    </button>
                    <button class="btn btn-sm btn-light dendro-fullscreen-btn" title="Plein écran">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Configurer les contrôles pour le dendrogramme
        setupDendrogramControls();
    }
}

// Configurer les contrôles pour le dendrogramme
function setupDendrogramControls() {
    const img = document.querySelector('.dendro-image');
    const zoomIn = document.querySelector('.dendro-zoom-in');
    const zoomOut = document.querySelector('.dendro-zoom-out');
    const reset = document.querySelector('.dendro-reset');
    const fullscreenBtn = document.querySelector('.dendro-fullscreen-btn');
    const container = document.querySelector('.dendro-image-container');
    
    let scale = 1;
    let panning = false;
    let pointX = 0;
    let pointY = 0;
    let start = { x: 0, y: 0 };
    
    function setTransform() {
        img.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
    }
    
    zoomIn?.addEventListener('click', () => {
        scale *= 1.2;
        setTransform();
    });
    
    zoomOut?.addEventListener('click', () => {
        scale *= 0.8;
        setTransform();
    });
    
    reset?.addEventListener('click', () => {
        scale = 1;
        pointX = 0;
        pointY = 0;
        setTransform();
    });
    
    // Mode plein écran
    fullscreenBtn?.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                showNotification('Erreur lors du passage en plein écran: ' + err.message, 'error');
            });
        } else {
            document.exitFullscreen();
        }
    });
    
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
            fullscreenBtn.title = 'Quitter le plein écran';
        } else {
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            fullscreenBtn.title = 'Plein écran';
        }
    });
    
    img?.addEventListener('mousedown', (e) => {
        e.preventDefault();
        panning = true;
        start = { x: e.clientX - pointX, y: e.clientY - pointY };
    });
    
    document.addEventListener('mouseup', () => {
        panning = false;
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!panning) return;
        pointX = e.clientX - start.x;
        pointY = e.clientY - start.y;
        setTransform();
    });
    
    // Support pour le zoom avec la molette
    img?.addEventListener('wheel', (e) => {
        e.preventDefault();
        const xs = (e.clientX - pointX) / scale;
        const ys = (e.clientY - pointY) / scale;
        
        if (e.deltaY < 0) {
            scale *= 1.1;
        } else {
            scale /= 1.1;
        }
        
        pointX = e.clientX - xs * scale;
        pointY = e.clientY - ys * scale;
        
        setTransform();
    });
}

// Afficher les statistiques des clusters
function showClusterStats(stats, colors) {
    let statsHTML = '';
    
    Object.entries(stats).forEach(([cluster, count], index) => {
        const percentage = ((count / rawData.length) * 100).toFixed(1);
        const color = colors[index % colors.length];
        
        statsHTML += `
            <div class="col-md-3 mb-3">
                <div class="card h-100 cluster-card">
                    <div class="card-body text-center">
                        <div class="cluster-color" style="background-color: ${color}"></div>
                        <h5 class="card-title">Cluster ${cluster}</h5>
                        <div class="cluster-count">${count}</div>
                        <div class="progress mt-2">
                            <div class="progress-bar" role="progressbar" style="width: ${percentage}%; background-color: ${color};" 
                                aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
                            </div>
                        </div>
                        <p class="text-muted mt-1">${percentage}% des données</p>
                    </div>
                </div>
            </div>
        `;
    });
    
    clusterStats.innerHTML = statsHTML;
}

// Afficher l'indicateur de chargement
function showLoading() {
    loadingIndicator.style.display = 'flex';
}

// Masquer l'indicateur de chargement
function hideLoading() {
    loadingIndicator.style.display = 'none';
}

// Afficher une notification
function showNotification(message, type = 'info') {
    // Supprimer les notifications existantes
    document.querySelectorAll('.notification').forEach(notification => {
        notification.remove();
    });
    
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Ajouter l'icône selon le type
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="notification-message">${message}</div>
        <button type="button" class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Ajouter au DOM
    document.body.appendChild(notification);
    
    // Ajouter le gestionnaire pour fermer
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.classList.add('notification-hide');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    });
    
    // Afficher la notification avec animation
    setTimeout(() => {
        notification.classList.add('notification-show');
    }, 10);
    
    // Fermer automatiquement après 5 secondes
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.classList.add('notification-hide');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
}