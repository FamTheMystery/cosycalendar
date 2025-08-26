# CosyCalender

CosyCalender is a simple, ambient-themed calendar web app built to run as a webserver. It is specifically designed to revitalize old iPads and tablets by turning them into useful side screens with a live clock and dynamic calendar.

## Features
- Ambient mode with random background images from `ambient-images/images.json`
- Background changes every 5 minutes
- Live clock with 12/24 hour support
- Calendar card updates at midnight
- Multiple color themes
- Optimized for older iPads and tablets

## Getting Started

### Prerequisites
- Node.js (for running the server)
- Git (for version control)

### Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/FamTheMystery/cosycalendar.git
   ```
2. Navigate to the project directory:
   ```sh
   cd cosycalendar
   ```
3. Install dependencies (if any):
   ```sh
   npm install
   ```

### Running the App
Start the server:
```sh
node server.js
```
Then open your browser or tablet and go to `http://localhost:3000` (or the port specified in your server).

## Folder Structure
- `public/` - Main frontend files
  - `index.html` - Main HTML file
  - `script.js` - Main JavaScript logic
  - `style.css` - Main styles
  - `ambient-images/` - Background images and `images.json`
- `server.js` - Node.js server
- `public-backup/` - Backup files (ignored by git)

## Customization
- Add your own images to `public/ambient-images/` and update `images.json`.
- Modify themes in `script.js` as needed.

## License
Apache

## Author
FamTheMystery