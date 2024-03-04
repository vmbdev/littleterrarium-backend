# Changelog

## [1.0.6] - next

### Added

- Seeding database script that adds one admin user.
- Location controllar can now send the number of plants in a location, without
having to request the whole plant list. Ideally to calculate pagination.
- API calls for administrators.
- API call to receive the amount of plants of the user.
- Moved some User calls to a new Auth Controller/Router.
- Cleanup of some code.

### Changes

- [Angular Integration] /angular/locales will now send all of the available
languages on request, not removing the default one.

### Fixes

- Fixed a bug in which the start script will run in development mode.
- Fixed a bug in which plant/photos were sent in the wrong order.

## [1.0.5] - 2023-12-18

### Fixes

- Fixed the public folder not working when not set with default value.
- Fixed an error in Angular routing when using relative paths for dist.
- Fixed an error for which the user didn't have access to it's own Terrarium.

## [1.0.4] - 2023-12-15

### Added

- README file. About time.

### Changes

- Species database model now has the name as unique. Please migrate up your
database.
- Seeding scripts now uses World Flora Online files (bigger and newer).
- Moved config files inside src directory to avoid the build creating a src
directory.
- Angular frontend path is now configurable.

### Fixes

- Build now properly emits JS files with the correct paths. Latest commit was
not properly tested, sorry about that.

## [1.0.3] - 2023-12-06

### Changes

- TSConfig now uses ESM code. Fixes utils scripts not working in Node 20.

### Fixes

- [Utils] Create species and update search fields scripts work again.

## [1.0.2] - 2023-12-06

### Changes

- Code cleanup.

### Fixes

- Parser now sets optional parameters as null when present but empty.

## [1.0.1] - 2023-11-30

### Added

- User password recovery using NodeMailer.

## [1.0.0] - 2023-01-30

First fully working version of the Little Terrarium backend! Of course, there's
a lot to do, add and improve yet, but this is the first fully working version.
From now on, changes will be added to this file.

### Changes

- User Controller/Signin will now send the proper data to the client.
- Angular i18n system completely functional.
- Uniform messages/error generator and better error handling.
- Support for WebP conversion.
- Support for user selected Plant photo cover.
- Better RESTful compliance.
