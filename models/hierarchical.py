import numpy as np
from sklearn.cluster import AgglomerativeClustering
from scipy.cluster.hierarchy import linkage

class hierarchicalClustering:
    
    def __init__(self, n_clusters=3, linkage='ward'):
        self.n_clusters = n_clusters
        self.linkage = linkage
        self.model = AgglomerativeClustering(n_clusters=n_clusters, linkage=linkage)
        self.linked = None
    
    def fit_predict(self, Data):
        """Adapter le modèle de clustering hiérarchique et prédire les étiquettes de cluster."""
        self.labels = self.model.fit_predict(Data)
        self.linked = linkage(Data, method=self.linkage)
        return self.labels