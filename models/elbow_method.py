import numpy as np
from sklearn.cluster import KMeans

class ElbowMethod:
    def __init__(self, data, k_range=(1, 10)):
        self.data = data
        self.k_range = range(max(2, k_range[0]), k_range[1]) # Commencer au moins à 2
        self.distortions = []
        self.optimal_k = None

    def fit(self):
        """Calculer les distorsions pour différentes valeurs de k"""
        self.distortions = []
        
        for k in self.k_range:
            # Utiliser KMeans de scikit-learn
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            kmeans.fit(self.data)
            self.distortions.append(kmeans.inertia_)
            print(f"k={k}, distortion={kmeans.inertia_}")

    def find_optimal_k(self):
        """Déterminer le nombre optimal de clusters avec la méthode du coude"""
        if not self.distortions:
            self.fit()
            
        if len(self.distortions) <= 1:
            self.optimal_k = next(iter(self.k_range))
            return self.optimal_k
        
        # Calculer les différences de distorsion
        diffs = np.diff(self.distortions)
        
        # Calculer le taux de changement (pente)
        norm_diffs = diffs / (np.array(self.distortions)[:-1] + 1e-10)
        
        # Le point du coude est là où la courbe commence à s'aplatir
        # Nous recherchons l'endroit où la pente change le plus rapidement
        try:
            acceleration = np.diff(norm_diffs)
            k_idx = np.argmax(acceleration) + 1
            
            # Convertir l'indice en valeur de k
            k_values = list(self.k_range)
            self.optimal_k = k_values[k_idx] if k_idx < len(k_values) else k_values[0]
        except:
            # Fallback simple
            self.optimal_k = list(self.k_range)[1] if len(list(self.k_range)) > 1 else list(self.k_range)[0]
        
        return self.optimal_k