# Bowling League Organizer

A comprehensive web application for managing bowling tournaments, tracking player statistics, and calculating season-based ratings.

## Features

- Tournament management with configurable game counts and formats
- Player registration and statistics tracking
- Season-based rating system with configurable points distribution
- Handicap calculation based on recent performance
- Leaderboard rankings
- Tournament applications system
- Multi-language support
- Dark/Light theme
- Export results to CSV
- Admin and regular user roles
- Responsive design for mobile and desktop

## Tech Stack

### Backend
- **NestJS** - Progressive Node.js framework
- **Prisma** - Type-safe ORM
- **PostgreSQL** - Primary database
- **Redis** - Caching and job queues
- **Passport + JWT** - Authentication
- **Swagger** - API documentation

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **TanStack Query** - Server state management
- **Zustand** - Global state management
- **React Router** - Navigation

## Getting Started

### Prerequisites
- Node.js 20+
- Docker and Docker Compose
- npm or pnpm

### Installation

1. **Clone the repository** (or you're already in it)

2. **Start the databases**
```bash
docker compose up -d
```

3. **Setup Backend**
```bash
cd api
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Start development server
npm run start:dev
```

Backend will be available at `http://localhost:3000`
API documentation at `http://localhost:3000/api/docs`

4. **Setup Frontend**
```bash
cd ../bowling-league-web
npm install

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:5173`

## Project Structure

```
bowling-league-organizer/
├── bowling-league-api/         # NestJS backend
│   ├── src/
│   │   ├── auth/              # Authentication module
│   │   ├── users/             # User management
│   │   ├── players/           # Player management
│   │   ├── tournaments/       # Tournament management
│   │   ├── rating/            # Rating calculations
│   │   ├── statistics/        # Statistics & leaderboards
│   │   ├── prisma/            # Prisma service
│   │   └── common/            # Shared utilities
│   └── prisma/
│       └── schema.prisma      # Database schema
│
├── bowling-league-web/        # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── store/             # Zustand stores
│   │   ├── lib/               # Utilities & API client
│   │   └── services/          # API services
│   └── public/
│
├── docker-compose.yml         # Database services
├── TECHNICAL_PLAN.md         # Detailed technical plan
└── PROJECT_STATUS.md         # Current project status
```

## Development

### Backend Commands
```bash
cd bowling-league-api

# Development
npm run start:dev

# Build
npm run build

# Production
npm run start:prod

# Tests
npm run test

# Prisma commands
npx prisma studio          # Database GUI
npx prisma migrate dev     # Create migration
npx prisma generate        # Generate client
```

### Frontend Commands
```bash
cd bowling-league-web

# Development
npm run dev

# Build
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

## Environment Variables

### Backend (.env)
```env
DATABASE_URL="postgresql://bowling_user:bowling_pass@localhost:5432/bowling_league"
JWT_SECRET="your-secret-key"
JWT_EXPIRATION="7d"
REDIS_HOST="localhost"
REDIS_PORT="6379"
PORT="3000"
FRONTEND_URL="http://localhost:5173"
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
```

## API Documentation

Once the backend is running, visit `http://localhost:3000/api/docs` for interactive API documentation powered by Swagger.

## Database Schema

The application uses the following main entities:
- **Users** - Authentication and preferences
- **Players** - Bowling players
- **Seasons** - 3-month tournament seasons
- **Tournaments** - Individual tournaments
- **TournamentParticipation** - Player scores and results
- **TournamentApplication** - Tournament applications
- **PlayerStatistics** - Aggregated player stats
- **RatingConfiguration** - Points distribution per season
- **Notifications** - User notifications

## Tournament Scoring Rules

- Regular games: Default 6 games (configurable)
- Handicap applied to regular games based on last 2 tournaments
- Cut-off games:
  - 8+ players: 1 additional game, top 4 proceed to finals
  - 12+ players: 2 additional games (top 8, then top 4)
- Finals: 2 games, NO handicap
- Rating points awarded based on final placement

## Contributing

See [TECHNICAL_PLAN.md](TECHNICAL_PLAN.md) for the development roadmap and implementation phases.

## License

[Your License Here]

## Support

For issues or questions, please open an issue in the repository.
