# Account Research App

A modern account research and management application built with Next.js, TypeScript, and TailwindCSS.

## Features

- **Account Management**: Add, edit, and manage account information
- **Advanced Search**: Filter accounts by industry, location, status, and value
- **Data Visualization**: Charts and analytics for account insights
- **Modern UI**: Clean, responsive interface with TailwindCSS
- **TypeScript**: Full type safety and better development experience

## Project Structure

```
windsurf-project/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
│   └── ui/               # UI components
├── lib/                   # Utility functions
│   ├── data.ts          # Mock data
│   └── utils.ts         # Helper functions
├── types/                 # TypeScript type definitions
│   └── account.ts        # Account-related types
└── README.md            # This file
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Key Features

### Account Management
- View detailed account information
- Add new accounts
- Edit existing accounts
- Track account status and value

### Search & Filtering
- Real-time search across account names, companies, and emails
- Filter by industry, location, status, and value
- Advanced filtering options

### Analytics Dashboard
- Total accounts overview
- Active vs prospect breakdown
- High-value account tracking
- Visual statistics

## Technology Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Date Handling**: date-fns
- **HTTP Client**: Axios

## Data Model

The app uses a comprehensive Account type that includes:

```typescript
interface Account {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  industry?: string;
  location?: string;
  website?: string;
  description?: string;
  foundedYear?: number;
  employeeCount?: number;
  revenue?: number;
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  researchNotes?: string;
  status: 'active' | 'inactive' | 'prospect' | 'customer';
  value: 'low' | 'medium' | 'high';
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
