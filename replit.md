# Battle Library Tool

## Overview
This tool provides a visual interface for viewing and analyzing battle libraries from the game Invasion. It uses server-side data storage in PostgreSQL, allowing administrators to upload data once for all users. The project aims to offer a comprehensive, user-friendly platform for accessing and understanding game battle data and replays.

## User Preferences
I prefer simple and concise language. I like an iterative development approach, where changes are introduced incrementally. Before making any major architectural changes or significant modifications to the codebase, please ask for my approval. Ensure the frontend remains responsive and visually appealing across different devices.

## System Architecture

### Database
The system uses PostgreSQL with Drizzle ORM. Key tables store information about battles, enemy teams, difficulty levels, hero details (icons, names, sort order), titan elements, attack replays, pet icons, spirit skills, and application settings.

### API Endpoints
The API provides endpoints for retrieving battle and replay data for users, and a comprehensive set of administrative endpoints for data upload and configuration. These include uploading battle lists, team compositions, difficulty levels, hero/pet/spirit icons, hero names, sort orders, titan elements, attack replays, talisman definitions, and main buff settings.

### User Interface and Pages
The application features three main pages:
- **Battle Library (`/`)**: Displays battle information for all users.
- **Replays Library (`/replays`)**: Shows battle replays with detailed character grades and pets.
- **Admin Panel (`/admin`)**: Provides an interface for administrators to upload and manage data.

UI/UX decisions include visual battle cards, filtering capabilities, search functionality, and dark/light theme support. Battle cards display game ID, team composition, chapter, battle number, type (heroic/titanic), power level, and elemental totems. Replay cards additionally show character grades and pet details.

### Functionality
- **Admin Data Upload**: Administrators can upload various game data (boss lists, teams, levels, icons, names, sort orders, titan elements, replays, talismans) via CSV/JSON files or folders, with progress indicators for large datasets.
- **Battle Library Viewing**: Users can view visual battle cards with comprehensive details and filter/search battles by type, chapter, and other criteria.
- **Replay Viewing**: Replay cards display `defendersFragments` JSON, including units, pets, favor, fragments, and effects. Character grades are color-coded based on fragment count.
- **Entity Viewer**: A unified component for viewing and managing game entities (heroes, creeps, titans, pets, spirit skills), offering search, filtering by category, and icon uploading.

### Data Structure and Logic
- **Battle Data**: `boss_list`, `boss_team`, and `boss_level` define battle parameters.
- **Icons**: Icons for characters, pets, and spirits are uploaded by category, identified by ID in filenames, and stored as base64.
- **Hero Names**: Default names are provided, but can be overridden via the admin panel.
- **Sort Order**: Heroes can be sorted using custom fractional values.
- **Titan Elements**: Defined by ID, element, and points, activating totems based on point thresholds (e.g., 3+ for Water/Fire/Earth, 2+ for Light/Dark).
- **Battle Type Logic**: `heroId` determines if a battle is titanic (3999-4999) or heroic.

## External Dependencies

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: Express.js, Drizzle ORM
- **Database**: PostgreSQL (Neon)
- **Validation**: Zod
- **Data Fetching**: TanStack Query
- **Deployment**: Google Apps Script (GAS) for a dual-mode architecture, using Google Sheets as a backend for the GAS version. This involves specific build configurations (`vite.gas.config.ts`) and a fetch interceptor for mapping REST calls to `google.script.run`.