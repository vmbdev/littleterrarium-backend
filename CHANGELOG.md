# Changelog

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
