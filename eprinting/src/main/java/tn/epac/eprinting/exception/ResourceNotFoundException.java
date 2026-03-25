package tn.epac.eprinting.exception;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }

    public ResourceNotFoundException(Long id, String resourceName) {
        super(String.format("%s not found with id: %d", resourceName, id));
    }
}