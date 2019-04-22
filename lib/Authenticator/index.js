'use strict';

module.exports = {
    CredentialsProviders: require('./credentialsProviders'),
    Authenticator: require('./Authenticator'),
    HTTPAuthenticator: require('./HTTPAuthenticator'),
    BasicHTTPAuthenticator: require('./BasicHTTPAuthenticator'),
    DigestHTTPAuthentication: require('./DigestHTTPAuthentication')
};
