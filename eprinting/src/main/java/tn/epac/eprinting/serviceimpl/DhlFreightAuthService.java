package tn.epac.eprinting.serviceimpl;

import org.springframework.stereotype.Service;

@Service
public class DhlFreightAuthService {

    public String getAccessToken() {
        // appeler l'API d'auth DHL Freight
        // mettre en cache le token
        return "access-token";
    }
}
