import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Login from "./login";

const GOOGLE_CLIENT_ID = "16397182920-ma27ebi8s6fm95ufckvmcdk8cfng5op7.apps.googleusercontent.com";

const AppContent = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [pokemonList, setPokemonList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [selectedType, setSelectedType] = useState("all");
  const [allTypes, setAllTypes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [favorites, setFavorites] = useState(JSON.parse(localStorage.getItem("favorites")) || []);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentView, setCurrentView] = useState("home");
  const [favoritePokemonData, setFavoritePokemonData] = useState([]);
  const [isFiltering, setIsFiltering] = useState(false);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("google_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [pokemonCache, setPokemonCache] = useState({});
  const [selectedTypeView, setSelectedTypeView] = useState(null);
  const [typePokemonList, setTypePokemonList] = useState([]);
  const itemsPerPage = 12;

  useEffect(() => {
    fetchPokemonList();
    fetchAllTypes();
  }, []);

  useEffect(() => {
    if (pokemonList.length > 0 && filteredList.length === 0) {
      setFilteredList(pokemonList);
    }
  }, [pokemonList]);

  useEffect(() => {
    if (pokemonList.length > 0) {
      preCachePokemonData();
    }
  }, [pokemonList]);

  useEffect(() => {
    fetchFavoritePokemonDetails();
  }, [favorites]);

  const fetchFavoritePokemonDetails = async () => {
    if (favorites.length === 0) {
      setFavoritePokemonData([]);
      return;
    }
    try {
      const data = await Promise.all(
        favorites.map((name) =>
          axios.get(`https://pokeapi.co/api/v2/pokemon/${name}`)
        )
      );
      setFavoritePokemonData(data.map((res) => res.data));
    } catch (e) {
      console.log(e);
    }
  };

  const fetchPokemonList = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get("https://pokeapi.co/api/v2/pokemon?limit=10000");
      setPokemonList(res.data.results);
    } catch (e) {
      setError("Failed to load Pokémon list");
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTypes = async () => {
    try {
      const res = await axios.get("https://pokeapi.co/api/v2/type");
      setAllTypes(res.data.results);
    } catch (e) {
      console.log(e);
    }
  };

  const preCachePokemonData = async () => {
    if (pokemonList.length === 0) return;
    
    const batchSize = 50;
    let cached = { ...pokemonCache };
    
    for (let i = 0; i < pokemonList.length; i += batchSize) {
      const batch = pokemonList.slice(i, i + batchSize);
      
      try {
        const promises = batch.map(pokemon => {
          if (cached[pokemon.name]) {
            return Promise.resolve({ data: cached[pokemon.name] });
          }
          return axios.get(pokemon.url).catch(() => null);
        });
        
        const results = await Promise.all(promises);
        
        results.forEach((res, idx) => {
          if (res && res.data) {
            cached[batch[idx].name] = res.data;
          }
        });
        
        setPokemonCache(cached);
      } catch (e) {
        console.log("Pre-caching error:", e);
      }
    }
  };

  const fetchTypePokemon = async (typeName) => {
    try {
      setLoading(true);
      const res = await axios.get(`https://pokeapi.co/api/v2/type/${typeName}`);
      const pokemonByType = res.data.pokemon.map(p => ({
        name: p.pokemon.name,
        url: p.pokemon.url
      }));
      setTypePokemonList(pokemonByType);
      setSelectedTypeView(typeName);
      setCurrentPage(1);
    } catch (e) {
      console.log("Error fetching type pokémon:", e);
    } finally {
      setLoading(false);
    }
  };

  const filterPokemon = async () => {
    setIsFiltering(true);
    setCurrentPage(1);
    let filtered = pokemonList;

    if (searchTerm) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedType !== "all") {
      filtered = filtered.filter((pokemon) => {
        const cachedData = pokemonCache[pokemon.name];
        if (!cachedData) return false;
        
        const types = cachedData.types.map((t) => t.type.name);
        return types.includes(selectedType);
      });
    }

    setFilteredList(filtered);
    setIsFiltering(false);
  };

  const toggleFavorite = (pokemonName) => {
    let updated = [...favorites];
    if (updated.includes(pokemonName)) {
      updated = updated.filter((p) => p !== pokemonName);
    } else {
      updated.push(pokemonName);
    }
    setFavorites(updated);
    localStorage.setItem("favorites", JSON.stringify(updated));
  };

  const fetchPokemonDetails = async (pokemonName) => {
    try {
      const res = await axios.get(
        `https://pokeapi.co/api/v2/pokemon/${pokemonName}`
      );
      setSelectedPokemon(res.data);
    } catch (e) {
      console.log(e);
    }
  };

  const getPaginatedData = () => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredList.slice(start, end);
  };

  const getPaginatedFavorites = () => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return favoritePokemonData.slice(start, end);
  };

  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const favoriteTotalPages = Math.ceil(favoritePokemonData.length / itemsPerPage);

  const closeModal = () => {
    setSelectedPokemon(null);
  };

  const handleLogin = (userProfile) => {
    setUser(userProfile);
    localStorage.setItem("google_user", JSON.stringify(userProfile));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("google_user");
  };

  if (!user) {
    return (
      <div className="App">
        <h1>🔴 Pokédex 🔴</h1>
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="App">
      <div className="user-profile">
        <img src={user.picture} alt={user.name} className="profile-pic-small" />
        <span>{user.name}</span>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>
      <h1>🔴 Pokédex 🔴</h1>

      <div className="nav-tabs">
        <button
          className={`nav-tab ${currentView === "home" ? "active" : ""}`}
          onClick={() => {
            setCurrentView("home");
            setCurrentPage(1);
          }}
        >
           Home
        </button>
        <button
          className={`nav-tab ${currentView === "browse" ? "active" : ""}`}
          onClick={() => {
            setCurrentView("browse");
            setCurrentPage(1);
          }}
        >
          Browse
        </button>
        <button
          className={`nav-tab ${currentView === "favorites" ? "active" : ""}`}
          onClick={() => {
            setCurrentView("favorites");
            setCurrentPage(1);
          }}
        >
          ★ Favorites ({favorites.length})
        </button>
        <button
          className={`nav-tab ${currentView === "types" ? "active" : ""}`}
          onClick={() => {
            setCurrentView("types");
            setCurrentPage(1);
          }}
        >
          🎯 Types
        </button>
      </div>

      {currentView === "home" && (
        <div className="home-page">
          <div className="home-hero">
            <h2>Welcome to Pokédex! 🎮</h2>
            <p>Explore and discover all Pokémon from the Kanto region</p>
          </div>

          <div className="home-stats">
            <div 
              className="stat-card" 
              onClick={() => {
                setCurrentView("browse");
                setCurrentPage(1);
              }}
              style={{ cursor: "pointer" }}
            >
              <h3>📚 Total Pokémon</h3>
              <p className="stat-number">{pokemonList.length}</p>
            </div>
            <div 
              className="stat-card"
              onClick={() => {
                setCurrentView("favorites");
                setCurrentPage(1);
              }}
              style={{ cursor: "pointer" }}
            >
              <h3>❤️ Your Favorites</h3>
              <p className="stat-number">{favorites.length}</p>
            </div>
            <div 
              className="stat-card"
              onClick={() => {
                setCurrentView("types");
                setCurrentPage(1);
              }}
              style={{ cursor: "pointer" }}
            >
              <h3>🎯 Types Available</h3>
              <p className="stat-number">{allTypes.length}</p>
            </div>
          </div>

          <div className="home-features">
            <h3>Features</h3>
            <ul>
              <li>🔍 Search Pokémon by name</li>
              <li>🏷️ Filter by type</li>
              <li>❤️ Save your favorite Pokémon</li>
              <li>📋 View detailed Pokémon information</li>
              <li>📱 Fully responsive design</li>
            </ul>
          </div>

          <div className="home-cta">
            <button
              className="cta-button"
              onClick={() => {
                setCurrentView("browse");
                setCurrentPage(1);
              }}
            >
              Start Browsing →
            </button>
          </div>
        </div>
      )}

      {currentView === "browse" ? (
        <>
          <div className="controls">
            <div className="search-section">
              <input
                type="text"
                placeholder="Search Pokémon..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-section">
              <label htmlFor="type-filter">Filter by Type:</label>
              <select
                id="type-filter"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="type-filter"
              >
                <option value="all">All Types</option>
                {allTypes.map((type) => (
                  <option key={type.name} value={type.name}>
                    {type.name.charAt(0).toUpperCase() + type.name.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <button 
              className="filter-button" 
              onClick={filterPokemon}
              disabled={isFiltering}
            >
              {isFiltering ? "Filtering..." : "🔍 Apply Filter"}
            </button>
          </div>

          {error && <p className="error">{error}</p>}
          {loading && <p className="loading">Loading...</p>}

          <div className="pokemon-grid">
            {getPaginatedData().map((pokemon) => (
              <div key={pokemon.name} className="pokemon-card">
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.url.split("/")[6]}.png`}
                  alt={pokemon.name}
                  onClick={() => fetchPokemonDetails(pokemon.name)}
                  className="pokemon-image"
                />
                <h3>{pokemon.name.toUpperCase()}</h3>
                <button
                  className={`favorite-btn ${
                    favorites.includes(pokemon.name) ? "active" : ""
                  }`}
                  onClick={() => toggleFavorite(pokemon.name)}
                >
                  {favorites.includes(pokemon.name) ? "★" : "☆"}
                </button>
                <button
                  className="details-btn"
                  onClick={() => fetchPokemonDetails(pokemon.name)}
                >
                  View Details
                </button>
              </div>
            ))}
          </div>

          {filteredList.length > 0 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                ← Previous
              </button>
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Next →
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="favorites-header">
            <h2>Your Favorite Pokémon ({favorites.length})</h2>
            {favorites.length === 0 && (
              <p className="no-favorites">No favorites yet! Add some Pokémon to your favorites.</p>
            )}
          </div>

          {favoritePokemonData.length > 0 && (
            <>
              <div className="pokemon-grid">
                {getPaginatedFavorites().map((pokemon) => (
                  <div key={pokemon.name} className="pokemon-card">
                    <img
                      src={pokemon.sprites.front_default}
                      alt={pokemon.name}
                      onClick={() => fetchPokemonDetails(pokemon.name)}
                      className="pokemon-image"
                    />
                    <h3>{pokemon.name.toUpperCase()}</h3>
                    <button
                      className={`favorite-btn active`}
                      onClick={() => toggleFavorite(pokemon.name)}
                    >
                      ★
                    </button>
                    <button
                      className="details-btn"
                      onClick={() => fetchPokemonDetails(pokemon.name)}
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>

              {favoritePokemonData.length > 0 && (
                <div className="pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    ← Previous
                  </button>
                  <span className="pagination-info">
                    Page {currentPage} of {favoriteTotalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(favoriteTotalPages, currentPage + 1))}
                    disabled={currentPage === favoriteTotalPages}
                    className="pagination-btn"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {currentView === "types" && (
        <div className="types-page">
          {selectedTypeView ? (
            <>
              <div className="type-view-header">
                <button 
                  className="back-btn"
                  onClick={() => setSelectedTypeView(null)}
                >
                  ← Back to Types
                </button>
                <h2>{selectedTypeView.toUpperCase()} Pokémon ({typePokemonList.length})</h2>
              </div>

              {loading && <p className="loading">Loading {selectedTypeView} Pokémon...</p>}

              <div className="pokemon-grid">
                {typePokemonList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((pokemon) => (
                  <div key={pokemon.name} className="pokemon-card">
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.url.split("/")[6]}.png`}
                      alt={pokemon.name}
                      onClick={() => fetchPokemonDetails(pokemon.name)}
                      className="pokemon-image"
                    />
                    <h3>{pokemon.name.toUpperCase()}</h3>
                    <button
                      className={`favorite-btn ${
                        favorites.includes(pokemon.name) ? "active" : ""
                      }`}
                      onClick={() => toggleFavorite(pokemon.name)}
                    >
                      {favorites.includes(pokemon.name) ? "★" : "☆"}
                    </button>
                    <button
                      className="details-btn"
                      onClick={() => fetchPokemonDetails(pokemon.name)}
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>

              {typePokemonList.length > itemsPerPage && (
                <div className="pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    ← Previous
                  </button>
                  <span className="pagination-info">
                    Page {currentPage} of {Math.ceil(typePokemonList.length / itemsPerPage)}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(Math.ceil(typePokemonList.length / itemsPerPage), currentPage + 1))}
                    disabled={currentPage === Math.ceil(typePokemonList.length / itemsPerPage)}
                    className="pagination-btn"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="types-header">
                <h2>All Pokémon Types ({allTypes.length})</h2>
                <p>Click on a type to view all Pokémon of that type</p>
              </div>

              <div className="types-grid">
                {allTypes.map((type) => (
                  <div 
                    key={type.name} 
                    className="type-card"
                    onClick={() => fetchTypePokemon(type.name)}
                    style={{ cursor: "pointer" }}
                  >
                    <h3>{type.name.toUpperCase()}</h3>
                    <span className="type-icon">→</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {selectedPokemon && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={closeModal}>
              ✕
            </button>
            <div className="modal-body">
              <img
                src={selectedPokemon.sprites.front_default}
                alt={selectedPokemon.name}
                className="modal-image"
              />
              <div className="modal-info">
                <h2>{selectedPokemon.name.toUpperCase()}</h2>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="label">ID:</span>
                    <span>{selectedPokemon.id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Height:</span>
                    <span>{Math.round(selectedPokemon.height * 3.9)}"</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Weight:</span>
                    <span>{Math.round(selectedPokemon.weight / 4.3)} lbs</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Type(s):</span>
                    <span>
                      {selectedPokemon.types
                        .map((t) => t.type.name)
                        .join(", ")
                        .toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Abilities:</span>
                    <span>
                      {selectedPokemon.abilities
                        .map((a) => a.ability.name)
                        .join(", ")
                        .toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Base Experience:</span>
                    <span>{selectedPokemon.base_experience}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => (
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <AppContent />
  </GoogleOAuthProvider>
);

export default App;
