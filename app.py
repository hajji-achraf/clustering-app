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
from models.kmeans import KmeansClustering
from models.hierarchical import hierarchicalClustering
from models.elbow_method import ElbowMethod
from scipy.cluster.hierarchy import dendrogram, linkage

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
        data = request.json.get('data')
        features = request.json.get('features')
        n_clusters = request.json.get('n_clusters', 3)
        distance_metric = request.json.get('distance_metric', 'Euclidean')
        df = pd.DataFrame(data)
        features_df = df[features]
        kmeans = KmeansClustering(k=n_clusters, distance=distance_metric)
        labels = kmeans.fit(features_df.values)
        unique_labels, counts = np.unique(labels, return_counts=True)
        cluster_stats = {str(label): int(count) for label, count in zip(unique_labels, counts)}
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
        data = request.json.get('data')
        features = request.json.get('features')
        n_clusters = request.json.get('n_clusters', 3)
        linkage_method = request.json.get('linkage', 'ward')
        df = pd.DataFrame(data)
        features_df = df[features]
        hc = hierarchicalClustering(n_clusters=n_clusters, linkage=linkage_method)
        labels = hc.fit_predict(features_df.values)
        unique_labels, counts = np.unique(labels, return_counts=True)
        cluster_stats = {str(label): int(count) for label, count in zip(unique_labels, counts)}
        plot_data = features_df.values.tolist()
        plt.figure(figsize=(12, 8))
        colors = ['#FF5252', '#B2D732', '#00BCD4', '#E040FB', '#FF9800', '#4CAF50', '#2196F3']
        Z = linkage(features_df.values, method=linkage_method)
        if Z is not None and Z.shape[0] >= n_clusters:
            threshold = Z[-n_clusters+1, 2] if n_clusters > 1 else None
            dendro = dendrogram(
                Z,
                orientation='left',
                leaf_font_size=10,
                color_threshold=threshold,
                above_threshold_color='gray',
                no_labels=False,
                leaf_rotation=0
            )
            plt.title(f'Dendrogramme du Clustering Hiérarchique (linkage={linkage_method})')
            plt.xlabel('Distance')
            plt.ylabel('Échantillons')
            plt.grid(True, alpha=0.3, linestyle='--')
            plt.tight_layout()
            if threshold:
                plt.axvline(x=threshold, color='r', linestyle='--', alpha=0.7)
                plt.text(threshold+2, 0, f'Seuil pour {n_clusters} clusters', 
                        fontsize=10, color='r', verticalalignment='bottom')
        else:
            plt.text(0.5, 0.5, "Données dendrogramme non disponibles", 
                     horizontalalignment='center', verticalalignment='center',
                     fontsize=14, color='gray')
        # => Sauvegarde dans /tmp pour compatibilité Vercel
        dendrogram_filename = f'dendrogram_{uuid.uuid4().hex}.png'
        dendrogram_path = os.path.join('/tmp', dendrogram_filename)
        plt.savefig(dendrogram_path, dpi=150, bbox_inches='tight')
        plt.close()
        return jsonify({
            'success': True,
            'clusters': labels.tolist(),
            'n_clusters': n_clusters,
            'stats': cluster_stats,
            'plot_data': plot_data,
            'dendrogram_url': f'/images/{dendrogram_filename}',
            'features': features
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/images/<filename>')
def serve_image(filename):
    return send_file(os.path.join('/tmp', filename))

@app.route('/api/elbow', methods=['POST'])
def run_elbow():
    try:
        data = request.json.get('data')
        features = request.json.get('features')
        max_k = min(request.json.get('max_k', 10), 10)
        df = pd.DataFrame(data)
        features_df = df[features]
        elbow = ElbowMethod(features_df.values, k_range=(2, max_k + 1))
        elbow.fit()
        optimal_k = elbow.find_optimal_k()
        k_values = list(range(2, max_k + 1))
        distortions = elbow.distortions[1:len(k_values)+1]
        min_len = min(len(k_values), len(distortions))
        k_values = k_values[:min_len]
        distortions = distortions[:min_len]
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

if __name__ == '__main__':
    app.run(debug=True)