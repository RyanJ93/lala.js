# Changelog
All notable changes to this project will be documented in this file.

## [0.1.3]

### Added
- "route" presenter that allows to get the URL to a route given its name in a view.
- "asset" presenter that allows to get the URL to a file given its path and resource route name in a view.

### Changed
- Fixed a bug that was causing CSRF to not working in view routes.
- Fixed a bug in response helpers.
- Fixed a bug that was causing hidden files to not be served despite the "serveHiddenFiles" was turned on.

## [0.1.2]
### Added

- Support for range requests.
- Support for CSP.
- Support for CORS.
- Support for HTTP cache management.
- Support for the Access header.
- Support for views' source caching.
- CSRF cookie options can now be changed in the AuthenticatorProcessor.
- Automatic CSRF validation for routes.
- Heroku environment detection thought the "IS_ON_HEROKU" constant.
- Support for conditional requests.
- Support for named fields in validation rule declaration.
- Uploaded files can now be marked as permanent without moving them.

### Changed

- Views are now built on top of the factory pattern.
- CSRF must now be explicitly enabled for a route to be generated.
- Firewall class has now been migrated to Interceptor.
- Fixed an issue that was obliging to install some optional dependencies.
- Improved performance.
- Some minor bug fix.

### Removed

- Deprecated access middlewares in favour of interceptors.