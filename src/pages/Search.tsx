import { useState, useMemo } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import TrackCard from '../components/TrackCard';
import { MOCK_TRACKS, GENRES } from '../data/mockData';

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

    const results = useMemo(() => {
        let tracks = MOCK_TRACKS;

        if (selectedGenre) {
            tracks = tracks.filter(t => t.genre === selectedGenre);
        }

        if (query.trim()) {
            const q = query.toLowerCase();
            tracks = tracks.filter(
                t =>
                    t.title.toLowerCase().includes(q) ||
                    t.artist.toLowerCase().includes(q) ||
                    t.album.toLowerCase().includes(q)
            );
        }

        return tracks;
    }, [query, selectedGenre]);

    return (
        <div className="page-container">
            <h1 style={{ marginBottom: 24 }}>Search</h1>

            {/* Search Input */}
            <div className="search-input-wrapper">
                <SearchIcon />
                <input
                    type="text"
                    className="search-page-input"
                    placeholder="Search tracks, artists, albums..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    style={{ paddingLeft: 44 }}
                />
            </div>

            {/* Genre Filter */}
            <div className="section">
                <div className="section-header">
                    <h2>Browse Genres</h2>
                    {selectedGenre && (
                        <button className="section-link" onClick={() => setSelectedGenre(null)}>
                            Clear filter ×
                        </button>
                    )}
                </div>
                <div className="genre-grid">
                    {GENRES.map(genre => (
                        <div
                            key={genre}
                            className={`genre-card${selectedGenre === genre ? ' active' : ''}`}
                            onClick={() =>
                                setSelectedGenre(selectedGenre === genre ? null : genre)
                            }
                            style={
                                selectedGenre === genre
                                    ? { background: 'var(--fg)', color: 'var(--accent-fg)', borderColor: 'var(--fg)' }
                                    : {}
                            }
                        >
                            {genre}
                        </div>
                    ))}
                </div>
            </div>

            {/* Results */}
            <div className="section">
                <div className="section-header">
                    <h2>
                        {query || selectedGenre
                            ? `Results (${results.length})`
                            : 'All Tracks'}
                    </h2>
                </div>
                {results.length > 0 ? (
                    <div className="track-grid">
                        {results.map(track => (
                            <TrackCard key={track.id} track={track} queue={results} />
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <SearchIcon />
                        <h3>No results found</h3>
                        <p>Try a different search term or genre.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
