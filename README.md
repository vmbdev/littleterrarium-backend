# Little Terrarium Backend Server

![Little Terrarium](https://littleterrarium.one/assets/oglt.png)

**Little Terrarium** allows you to manage your whole plant collection.

Little Terrarium Backend is made with Express.js, and is part of the Little
Terrarium project.

You can access the live app on
[https://littleterrarium.one](https://littleterrarium.one).

## Getting Started

You can get the latest code from
[here](https://github.com/vmbdev/littleterrarium-backend/archive/refs/heads/main.zip)
or through Git:

```bash
git clone https://github.com/vmbdev/littleterrarium-backend.git
```

### Prerequisites

Requires [Node.js](https://nodejs.org/) 18 or later installed on your system.

### Installation

First of all, we need to install its dependencies. Open a terminal and get to
the directory where it's installed and run the following command:

```bash
npm install
```

### Setup

Then we'll need to configure the app. Inside of **src/config**, rename
**littleterrarium.config.example.ts** to **littleterrarium.config.ts** and edit
it. Options are:

- **server.port**: Port to listen to.
- **server.useCors** and **server.corsOrigin**: Whether to enable _cross-origin
  resource sharing_ and from which server.
- **server.session.secret**: A sentence to use to encrypt the session secret.
- **angular.buildOutput**: Path to the output directory of the Little Terrarium
  web version (usually the "dist" folder).
- **angular.defaultLang**: If you're using a build of Little Terrarium
  web version, and it's localized, write here the locale for the base URL.
- **plants.number**: On each page of the plant list, how many plants to be
  loaded.
- **files.hash**: For user uploaded files (i.e. photos), what kind of hash
  algorithm should be used to name them.
- **files.folder.division**: How many subfolders will be created to store each
  file. For example, if the hash is "avocado" and the division is 3, the file
  will be saved in /av/oc/ad/o.jpg. This is to prevent some file systems having
  a limit of files per directory.
- **files.folder.temp**: The name of the folder for temporary files.
- **files.folder.public**: The name of the folder for the files publicly
  served.
- **files.webp**: If the files should be converted to WebP format.
- **files.webpOnly**: If files.webp is true, then only the WebP format will be
  stored.
- **username.minLength**: The minimum length for a username.
- **username.maxLength**: The maximum length for a username.
- **password.minLength**: The minimum length for a password.
- **password.requireUppercase**: Whether the password must have an uppercase
  letter.
- **password.requireNumber**: Whether the password must have a number.
- **password.requireNonAlphanumeric**: Whether the password must have an
  character that is not a number or a letter.
- **mailer**: Configuration for your SMTP server for sending emails (i.e. for
  password recovery). It uses the
  [Nodemailer object for createTransport](https://nodemailer.com/smtp/).

### Database Setup

Rename **.env.example** to **.env** and configure it for Prisma. Check the list
of supported [Connection URLs](https://pris.ly/d/connection-strings) by Prisma
if you need.

To populate the database run the following command:

```bash
npx prisma migrate dev
```

### Creating the list of species

A list of species can be integrated into the database. Users can create plants
and choose the scientific name of the specie from a list after this.

Go to the
[WFO Plant List Snapshot Archive](https://wfoplantlist.org/plant-list/classifications)
and select the latest one. Download the Darwin Core Archive for the backbone
(usually is a file called \_DwC_backbone_R.zip), extract it and put the
classification.csv file into **/utils/res/**. There should be already a file
called commonnames.csv containing a list of names commonly used for some
species. Now run the following command to incorporate both files into the
database:

```bash
npm run db-species
```

It's going to be a slow process, as there are more than 1.5 millions of species
in there, and the process checks if there's already one in the database to
avoid destroying the existing plants in an update. I sincerely hope that there
is a better tool in the future for this.

## Usage

To compile and start the server, run:

```bash
npm run start
```

This will create the "build" directory with the JS files. To just compile the
files run:

```bash
npm run build
```

To run the server in development mode and watch for file changes, run:

```bash
npm run dev
```

## Built with

- [Node.js](https://nodejs.org/) - JavaScript runtime environment
- [TypeScript](https://www.typescriptlang.org/) - JavaScript with syntax for
types
- [Prisma](https://www.prisma.io/) - ORM
- [Express](https://expressjs.com/) - Web framework
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js) - A library to help you
  hash passwords
- [day.js](https://day.js.org/) - Date management library
- [Nodemailer](https://nodemailer.com/) - Mail sending
- [Sharp](https://sharp.pixelplumbing.com/) - High performance Node.js image
  processing
- [CSV Parse](https://csv.js.org/parse/) - Parser for CSV documents
- [tsx](https://github.com/privatenumber/tsx) - CLI command for running
  TypeScript
- [prisma-session-store](https://github.com/kleydon/prisma-session-store) - An
  Express session store implementation for the Prisma ORM

## License

fetch-reddit-media is licensed under the MIT License - see the
[LICENSE](https://github.com/vmbdev/fetch-reddit-media/blob/main/LICENSE)
file for more details.

## Credits

Huge thanks to
[World Flora Online Plant List](https://wfoplantlist.org/plant-list/) for their
plant database.
