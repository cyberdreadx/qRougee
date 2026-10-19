import { useState, useMemo } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import TrackRow from '../components/TrackRow';
import { GENRES } from '../data/mockData';
import { useNftTracks } from '../hooks/useNftTracks';

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
    const { playableTracks: tracks } = useNftTracks();

    const results = useMemo(() => {
        let filtered = tracks;

        if (selectedGenre) {
            filtered = filtered.filter(t => t.genre === selectedGenre);
        }

        if (query.trim()) {
            const q = query.toLowerCase();
            filtered = filtered.filter(
                t =>
                    t.title.toLowerCase().includes(q) ||
                    t.artist.toLowerCase().includes(q) ||
                    t.album.toLowerCase().includes(q)
            );
        }

        return filtered;
    }, [query, selectedGenre, tracks]);

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
                <label
                    htmlFor="genre-select"
                    style={{ display: 'block', fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 8 }}
                >
                    Browse Genres
                </label>
                <select
                    id="genre-select"
                    className="form-input"
                    value={selectedGenre ?? ''}
                    onChange={e => setSelectedGenre(e.target.value || null)}
                    style={{ maxWidth: 320, cursor: 'pointer' }}
                >
                    <option value="">All genres</option>
                    {GENRES.map(genre => (
                        <option key={genre} value={genre}>{genre}</option>
                    ))}
                </select>
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
                    <div className="track-rows">
                        {results.map(track => (
                            <TrackRow key={track.id} track={track} queue={results} />
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
