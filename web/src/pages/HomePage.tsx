import React from 'react';

export const HomePage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-foreground">Welcome to Bowling League Organizer</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Manage your bowling tournaments, track player statistics, and calculate ratings.
      </p>
    </div>
  );
};
