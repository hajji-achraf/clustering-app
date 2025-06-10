from flask import Flask, render_template, request, jsonify, send_file
import pandas as pd
import numpy as np
import json
import io
import os
import uuid
import matplotlib
matplotlib.use('Agg')  # Configuration pour serveur sans affichage
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap
import matplotlib.cm as cm
from models.kmeans import KmeansClustering
from models.hierarchical import hierarchicalClustering
from models.elbow_method import ElbowMethod
from scipy.cluster.hierarchy import dendrogram, linkage, fcluster

# Créer le dossier pour les images si nécessaire
os.makedirs('static/images', exist_ok=True)

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/upload', methods=['POST'])
def upload_file():
    try:
        file = request.files['file']
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(file.stream.read().decode('utf-8')))
        else:
            return jsonify({'error': 'Format de fichier non supporté'}), 400
        
        # Récupérer les colonnes numériques
        numeric_columns = df.select_dtypes(include=[np.number]).columns.tolist()
        
        return jsonify({
            'success': True,
            'data': json.loads(df.to_json(orient='records')),
            'columns': df.columns.tolist(),
            'numeric_columns': numeric_columns
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate-sample', methods=['POST'])
def generate_sample():
    try:
        # Générer un exemple de jeu de données
        n_samples = 150
        centers_count = 4
        
        np.random.seed(42)
        center_box = (-10, 10)
        centers = np.random.uniform(center_box[0], center_box[1], size=(centers_count, 2))
        
        X = []
        for center in centers:
            cluster = center + np.random.randn(n_samples // centers_count, 2)
            X.append(cluster)
        
        X = np.vstack(X)
        
        df = pd.DataFrame(X, columns=["Feature 1", "Feature 2"])
        
        return jsonify({
            'success': True,
            'data': json.loads(df.to_json(orient='records')),
            'columns': df.columns.tolist(),
            'numeric_columns': df.columns.tolist()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/kmeans', methods=['POST'])
def run_kmeans():
    try:
        # Récupérer les données du frontend
        data = request.json.get('data')
        features = request.json.get('features')
        n_clusters = request.json.get('n_clusters', 3)
        distance_metric = request.json.get('distance_metric', 'Euclidean')
        
        # Convertir en DataFrame
        df = pd.DataFrame(data)
        features_df = df[features]
        
        # Exécuter K-means
        kmeans = KmeansClustering(k=n_clusters, distance=distance_metric)
        labels = kmeans.fit(features_df.values)
        
        # Statistiques des clusters
        unique_labels, counts = np.unique(labels, return_counts=True)
        cluster_stats = {str(label): int(count) for label, count in zip(unique_labels, counts)}
        
        # Pour Plotly.js, retourner les données des points et leurs clusters
        return jsonify({
            'success': True,
            'clusters': labels.tolist(),
            'centroids': kmeans.centroids.tolist(),
            'n_clusters': n_clusters,
            'stats': cluster_stats,
            'plot_data': features_df.values.tolist(),
            'features': features
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/hierarchical', methods=['POST'])
def run_hierarchical():
    try:
        # Récupérer les données du frontend
        data = request.json.get('data')
        features = request.json.get('features')
        n_clusters = request.json.get('n_clusters', 3)
        linkage_method = request.json.get('linkage', 'ward')
        
        # Convertir en DataFrame
        df = pd.DataFrame(data)
        features_df = df[features]
        
        # Exécuter Hierarchical Clustering
        hc = hierarchicalClustering(n_clusters=n_clusters, linkage=linkage_method)
        labels = hc.fit_predict(features_df.values)
        
        # Statistiques des clusters
        unique_labels, counts = np.unique(labels, return_counts=True)
        cluster_stats = {str(label): int(count) for label, count in zip(unique_labels, counts)}
        
        # Pour la visualisation des clusters avec Plotly
        plot_data = features_df.values.tolist()
        
        # 1. Créer une figure pour le clustering (sera tracée côté client avec Plotly)
        
        # 2. Créer un dendrogramme complet avec Matplotlib
        plt.figure(figsize=(12, 8))
        
        # Palette de couleurs vives pour les clusters
        colors = ['#FF5252', '#B2D732', '#00BCD4', '#E040FB', '#FF9800', '#4CAF50', '#2196F3']
        
        # Calculer ou récupérer la matrice de liaison
        if hasattr(hc, 'linked') and hc.linked is not None:
            Z = hc.linked
        else:
            Z = linkage(features_df.values, method=linkage_method)
        
        # Calculer le seuil pour la colorisation des clusters
        if Z is not None and Z.shape[0] >= n_clusters:
            threshold = Z[-n_clusters+1, 2] if n_clusters > 1 else None
            
            # Créer un dendrogramme avec des couleurs distinctes pour chaque cluster
            dendro = dendrogram(
                Z,
                orientation='left',  # Orientation horizontale
                leaf_font_size=10,
                color_threshold=threshold,
                above_threshold_color='gray',
                no_labels=False,     # Afficher les étiquettes
                leaf_rotation=0      # Rotation des étiquettes
            )
            
            plt.title(f'Dendrogramme du Clustering Hiérarchique (linkage={linkage_method})')
            plt.xlabel('Distance')
            plt.ylabel('Échantillons')
            plt.grid(True, alpha=0.3, linestyle='--')
            
            # Ajuster les marges pour s'assurer que tout est visible
            plt.tight_layout()
            
            # Ajouter une ligne horizontale pour indiquer le seuil de coupure
            if threshold:
                plt.axvline(x=threshold, color='r', linestyle='--', alpha=0.7)
                plt.text(threshold+2, 0, f'Seuil pour {n_clusters} clusters', 
                        fontsize=10, color='r', verticalalignment='bottom')
        else:
            # Fallback si les données de liaison ne sont pas disponibles
            plt.text(0.5, 0.5, "Données dendrogramme non disponibles", 
                     horizontalalignment='center', verticalalignment='center',
                     fontsize=14, color='gray')
        
        # Sauvegarder le dendrogramme
        dendrogram_filename = f'dendrogram_{uuid.uuid4().hex}.png'
        dendrogram_path = os.path.join('static', 'images', dendrogram_filename)
        plt.savefig(dendrogram_path, dpi=150, bbox_inches='tight')  # DPI augmenté pour plus de détails
        plt.close()
        
        return jsonify({
            'success': True,
            'clusters': labels.tolist(),
            'n_clusters': n_clusters,
            'stats': cluster_stats,
            'plot_data': plot_data,
            'dendrogram_url': dendrogram_path,
            'features': features
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/elbow', methods=['POST'])
def run_elbow():
    try:
        # Récupérer les données du frontend
        data = request.json.get('data')
        features = request.json.get('features')
        max_k = min(request.json.get('max_k', 10), 10)  # Limiter à 10 pour la performance
        
        # Convertir en DataFrame
        df = pd.DataFrame(data)
        features_df = df[features]
        
        # Exécuter Elbow Method
        elbow = ElbowMethod(features_df.values, k_range=(2, max_k + 1))
        elbow.fit()
        optimal_k = elbow.find_optimal_k()
        
        # S'assurer que k_values et distortions ont la même taille
        k_values = list(range(2, max_k + 1))
        distortions = elbow.distortions[1:len(k_values)+1]
        
        # S'assurer que les deux tableaux ont la même longueur
        min_len = min(len(k_values), len(distortions))
        k_values = k_values[:min_len]
        distortions = distortions[:min_len]
        
        # Retourner les données pour le tracé avec Plotly
        return jsonify({
            'success': True,
            'optimal_k': int(optimal_k),
            'k_values': k_values,
            'inertias': [float(d) for d in distortions]
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
