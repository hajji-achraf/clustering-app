import numpy as np

def euclidean_distance(point, points):
    """Compute Euclidean distance between a point and a set of points."""
    return np.sqrt(np.sum((points - point) ** 2, axis=1))

def manhattan_distance(point, points):
    """Compute Manhattan distance between a point and a set of points."""
    return np.sum(np.abs(points - point), axis=1)

def cosine_distance(point, points):
    """Compute Cosine distance between a point and a set of points."""
    norm_point = np.linalg.norm(point) + 1e-10
    norm_points = np.linalg.norm(points, axis=1) + 1e-10
    
    dot_products = np.sum(points * point, axis=1)
    cosine_similarity = dot_products / (norm_points * norm_point)
    
    return 1 - cosine_similarity

class KmeansClustering:
    
    def __init__(self, k=3, distance="Euclidean"):
        self.k = k
        self.distance = distance
        self.centroids = None
    
    def initialize_centroids(self, Data):
        self.centroids = np.random.uniform(np.amin(Data, axis=0), np.amax(Data, axis=0), size=(self.k, Data.shape[1]))

    def assign_clusters(self, Data):
        clusters = []
        for data_point in Data:
            if self.distance == "Euclidean":
                distances = euclidean_distance(data_point, self.centroids)
            elif self.distance == "Manhattan":
                distances = manhattan_distance(data_point, self.centroids)
            elif self.distance == "Cosine":
                distances = cosine_distance(data_point, self.centroids)
            cluster_num = np.argmin(distances)
            clusters.append(cluster_num)
        return np.array(clusters)

    def update_centroids(self, Data, labels):
        new_centroids = np.zeros((self.k, Data.shape[1]))
        for i in range(self.k):
            cluster_points = Data[labels == i]
            if len(cluster_points) > 0:
                new_centroids[i] = cluster_points.mean(axis=0)
            else:
                new_centroids[i] = self.centroids[i]
        return new_centroids

    def fit(self, Data, max_iter=100):
        self.initialize_centroids(Data)
        
        for _ in range(max_iter):
            labels = self.assign_clusters(Data)
            new_centroids = self.update_centroids(Data, labels)
            
            if np.all(np.linalg.norm(self.centroids - new_centroids, axis=1) < 0.0001):
                break
            else:
                self.centroids = new_centroids
        
        return labels