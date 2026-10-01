import { useState, useEffect, useRef } from 'react'
import './App.css'

// Google Maps direction URLs accept at most 9 waypoints.
const MAX_WALK_STOPS = 9

function formatDistance(m) {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`
}

function App() {
  const [mode, setMode] = useState('nearest')

  const [location, setLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [locating, setLocating] = useState(false)

  const [allSpecies, setAllSpecies] = useState([])
  const [query, setQuery] = useState('')
  const [selectedSpecies, setSelectedSpecies] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)

  const [result, setResult] = useState(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)

  const [walkSpecies, setWalkSpecies] = useState([])
  const [walk, setWalk] = useState(null)
  const [planning, setPlanning] = useState(false)
  const [walkError, setWalkError] = useState(null)

  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    fetch('/api/species')
      .then((r) => r.json())
      .then(setAllSpecies)
  }, [])

  const filtered = query.length > 0
    ? allSpecies
      .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
      .filter((s) => mode !== 'walk' || !walkSpecies.includes(s))
      .slice(0, 50)
    : []

  const walkFull = walkSpecies.length >= MAX_WALK_STOPS

  function requestLocation() {
    setLocating(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => {
        setLocationError('Could not get your location. Please allow access and try again.')
        setLocating(false)
      },
    )
  }

  function switchMode(next) {
    setMode(next)
    setQuery('')
    setSelectedSpecies('')
    setDropdownOpen(false)
  }

  function pickSpecies(name) {
    if (mode === 'walk') {
      if (!walkFull) setWalkSpecies((list) => [...list, name])
      setQuery('')
      setDropdownOpen(false)
      setWalk(null)
      setWalkError(null)
      return
    }
    setSelectedSpecies(name)
    setQuery(name)
    setDropdownOpen(false)
    setResult(null)
    setSearchError(null)
  }

  function handleInputChange(e) {
    setQuery(e.target.value)
    setSelectedSpecies('')
    setDropdownOpen(true)
    setActiveIdx(0)
    setResult(null)
  }

  function handleKeyDown(e) {
    if (!dropdownOpen || filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pickSpecies(filtered[activeIdx])
    } else if (e.key === 'Escape') {
      setDropdownOpen(false)
    }
  }

  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e) {
      if (!inputRef.current?.contains(e.target) && !dropdownRef.current?.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  async function findTree() {
    if (!location || !selectedSpecies) return
    setSearching(true)
    setSearchError(null)
    setResult(null)
    try {
      const params = new URLSearchParams({
        species: selectedSpecies,
        lat: location.lat,
        lng: location.lng,
      })
      const res = await fetch(`/api/trees/nearest?${params}`)
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.detail ?? 'Something went wrong')
      }
      setResult(await res.json())
    } catch (err) {
      setSearchError(err.message)
    } finally {
      setSearching(false)
    }
  }

  function removeWalkSpecies(name) {
    setWalkSpecies((list) => list.filter((s) => s !== name))
    setWalk(null)
    setWalkError(null)
  }

  async function planWalk() {
    if (!location || walkSpecies.length === 0) return
    setPlanning(true)
    setWalkError(null)
    setWalk(null)
    try {
      const params = new URLSearchParams({ lat: location.lat, lng: location.lng })
      walkSpecies.forEach((s) => params.append('species', s))
      const res = await fetch(`/api/walk?${params}`)
      if (!res.ok) {
        const body = await res.json()
        throw new Error(typeof body.detail === 'string' ? body.detail : 'Something went wrong')
      }
      setWalk(await res.json())
    } catch (err) {
      setWalkError(err.message)
    } finally {
      setPlanning(false)
    }
  }

  const walkUrl = walk && location
    ? (() => {
      const here = `${location.lat},${location.lng}`
      const params = new URLSearchParams({
        api: '1',
        origin: here,
        destination: here,
        waypoints: walk.stops.map((s) => `${s.lat},${s.lon}`).join('|'),
        travelmode: 'walking',
      })
      return `https://www.google.com/maps/dir/?${params}`
    })()
    : null

  const canPlan = location && walkSpecies.length > 0 && !planning

  const mapsUrl = result
    ? `https://www.google.com/maps/dir/?api=1&destination=${result.lat},${result.lon}`
    : null

  const canSearch = location && selectedSpecies && !searching

  return (
    <div className="app">
      <h1>Tre<span>ek</span></h1>

      <div className="mode-toggle" role="tablist">
        <button
          role="tab"
          aria-selected={mode === 'nearest'}
          className={mode === 'nearest' ? 'active' : ''}
          onClick={() => switchMode('nearest')}
        >
          Nearest tree
        </button>
        <button
          role="tab"
          aria-selected={mode === 'walk'}
          className={mode === 'walk' ? 'active' : ''}
          onClick={() => switchMode('walk')}
        >
          Plan a walk
        </button>
      </div>

      {/* Step 1 — location */}
      <div className="card">
        <span className="card-label">Your location</span>
        <div className="location-row">
          {location ? (
            <span className="location-text">
              {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </span>
          ) : (
            <span className="location-text" style={{ color: '#aaa' }}>Not set</span>
          )}
          <button
            className="btn-primary btn-sm"
            onClick={requestLocation}
            disabled={locating}
          >
            {locating ? 'Locating…' : location ? 'Refresh' : 'Use my location'}
          </button>
        </div>
        {locationError && <p className="error">{locationError}</p>}
      </div>

      {/* Step 2 — species search */}
      <div className="card">
        <span className="card-label">
          {mode === 'walk'
            ? `Trees to visit (${walkSpecies.length}/${MAX_WALK_STOPS})`
            : 'Tree species'}
        </span>
        {mode === 'walk' && walkSpecies.length > 0 && (
          <div className="chips">
            {walkSpecies.map((name) => (
              <span key={name} className="chip">
                {name}
                <button
                  className="chip-remove"
                  onClick={() => removeWalkSpecies(name)}
                  aria-label={`Remove ${name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="search-wrapper">
          <input
            ref={inputRef}
            className="search-input"
            type="text"
            placeholder={
              mode === 'walk'
                ? (walkFull ? 'Walk is full' : 'Add a species…')
                : 'Search species…'
            }
            disabled={mode === 'walk' && walkFull}
            value={query}
            onChange={handleInputChange}
            onFocus={() => query && setDropdownOpen(true)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          {dropdownOpen && filtered.length > 0 && (
            <div className="dropdown" ref={dropdownRef}>
              {filtered.map((name, i) => (
                <div
                  key={name}
                  className={`dropdown-item${i === activeIdx ? ' active' : ''}`}
                  onMouseDown={() => pickSpecies(name)}
                  onMouseEnter={() => setActiveIdx(i)}
                >
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {mode === 'walk' && (
        <>
          <button className="btn-primary" onClick={planWalk} disabled={!canPlan}>
            {planning ? 'Planning…' : 'Plan circular walk'}
          </button>

          {walkError && <p className="error">{walkError}</p>}

          {walk && (
            <div className="result-card">
              <p className="result-species">Circular walk · {formatDistance(walk.distance_m)}</p>
              <p className="result-borough">As the crow flies — the walking route will be a bit longer.</p>
              {/* Letters match the markers Google Maps puts on the route: A is the start. */}
              <ol className="walk-stops">
                <li>
                  <span className="stop-badge stop-badge-home">A</span>
                  <span className="result-borough">Start at your location</span>
                </li>
                {walk.stops.map((s, i) => (
                  <li key={s.common_name}>
                    <span className="stop-badge">{String.fromCharCode(66 + i)}</span>
                    <a
                      className="walk-stop-link"
                      href={`https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="walk-stop-name">{s.common_name}</span>
                      <span className="result-borough"> · {s.borough}</span>
                    </a>
                  </li>
                ))}
                <li>
                  <span className="stop-badge stop-badge-home">
                    {String.fromCharCode(66 + walk.stops.length)}
                  </span>
                  <span className="result-borough">Back to start</span>
                </li>
              </ol>
              <p className="result-borough">
                Letters match the markers in Google Maps (the mobile app calls them Stop 1, 2…).
                Tap a tree to see it on its own.
              </p>
              <a
                className="maps-link"
                href={walkUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open walk in Google Maps →
              </a>
            </div>
          )}
        </>
      )}

      {mode === 'nearest' && (<>
      {/* Step 3 — find */}
      <button
        className="btn-primary"
        onClick={findTree}
        disabled={!canSearch}
      >
        {searching ? 'Searching…' : 'Find nearest tree'}
      </button>

      {searchError && <p className="error">{searchError}</p>}

      {result && (
        <div className="result-card">
          <p className="result-species">{result.common_name}</p>
          <p className="result-borough">{result.borough}</p>
          <a
            className="maps-link"
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get directions →
          </a>
        </div>
      )}
      </>)}
    </div>
  )
}

export default App
