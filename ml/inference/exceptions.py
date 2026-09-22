"""
Custom exception hierarchy for the ML inference service.
"""


class InferenceError(Exception):
    """Base exception for all inference-related errors."""
    pass


class ModelNotFoundError(InferenceError, FileNotFoundError):
    """Raised when the requested model artifact (.joblib) does not exist."""
    pass


class MetadataNotFoundError(InferenceError, FileNotFoundError):
    """Raised when the model metadata file (.json) does not exist."""
    pass


class SymbolNotFoundError(InferenceError, ValueError):
    """Raised when a symbol does not exist in the database or has no market data."""
    pass


class InsufficientDataError(InferenceError, ValueError):
    """Raised when there is not enough historical market data to compute features."""
    pass


class MissingFeaturesError(InferenceError, KeyError):
    """Raised when required feature columns are missing from the engineered dataset."""
    pass


class InvalidFeatureDataError(InferenceError, ValueError):
    """Raised when feature data contains NaN, Inf, or invalid values for prediction."""
    pass


class InvalidModelInputError(InferenceError, ValueError):
    """Raised when the input shape or type does not match model requirements."""
    pass

