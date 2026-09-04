import { useState, useEffect, useTransition } from 'react'
import { Search, Disc3, Music2, Clock, Sparkles, Library, LogIn, LogOut, Disc, CheckCircle2 } from 'lucide-react'
import type { SpotifyTrack } from '../../types/spotify'
import { 
  getStoredUserToken, 
  handleAuthCallback, 
  loginWithSpotify, 
  disconnectSpotifyUser, 
  fetchUserProfile, 
  fetchUserPlaylists, 
  DEMO_USER_PLAYLISTS,
  type SpotifyUserProfile,
  type SpotifyUserPlaylist 
} from '../../utils/spotifyPkce'

interface SearchDrawerProps {
  onSelectTrack: (track: SpotifyTrack) => void
  currentTrackId?: string
}

export function SearchDrawer({ onSelectTrack, currentTrackId }: SearchDrawerProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'playlists'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SpotifyTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [demoNotice, setDemoNotice] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // PKCE User State
  const [userToken, setUserToken] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<SpotifyUserProfile | null>(null)
  const [userPlaylists, setUserPlaylists] = useState<SpotifyUserPlaylist[]>([])
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false)

  // Check for PKCE callback or stored token on mount
  useEffect(() => {
    async function checkAuth() {
      // 1. Check if returning from Spotify redirect
      const callbackToken = await handleAuthCallback()
      const token = callbackToken || getStoredUserToken()
      if (token) {
        setUserToken(token)
        loadUserData(token)
      }
    }
    checkAuth()
  }, [])

  const loadUserData = async (token: string) => {
    setIsLoadingPlaylists(true)
    try {
      const [profile, playlists] = await Promise.all([
        fetchUserProfile(token),
        fetchUserPlaylists(token)
      ])
      setUserProfile(profile)
      setUserPlaylists(playlists.length > 0 ? playlists : DEMO_USER_PLAYLISTS)
    } catch {
      setUserPlaylists(DEMO_USER_PLAYLISTS)
    } finally {
      setIsLoadingPlaylists(false)
    }
  }

  const handleDisconnect = () => {
    disconnectSpotifyUser()
    setUserToken(null)
    setUserProfile(null)
    setUserPlaylists([])
  }

  // Catalog search function with debounce
  useEffect(() => {
    if (activeTab !== 'search') return

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}&type=track`)
        const data = await res.json()
        
        startTransition(() => {
          if (data.tracks?.items) {
            setResults(data.tracks.items)
          } else {
            setResults([])
          }
          if (data.isDemoMode) {
            setDemoNotice(data.message)
          } else {
            setDemoNotice(null)
          }
        })
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, activeTab])

  const formatDuration = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000)
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Convert playlist to turntable track representation
  const handleSelectPlaylist = (playlist: SpotifyUserPlaylist) => {
    const playlistTrack: SpotifyTrack = {
      id: playlist.id,
      name: playlist.name,
      artists: [{ name: playlist.description || 'Spotify Playlist' }],
      album: {
        name: playlist.name,
        images: playlist.images.length > 0 ? playlist.images : [{ url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400' }]
      },
      duration_ms: 240000,
      uri: playlist.uri,
      type: 'playlist'
    }
    onSelectTrack(playlistTrack)
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-[#10121a]/95 backdrop-blur-xl border-r border-white/5 w-80 md:w-96 p-4">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[#161822] rounded-lg mb-3 shrink-0 border border-white/5">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-semibold tracking-wide transition-all ${
            activeTab === 'search'
              ? 'bg-amber-400 text-black shadow-md'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Catalog Search</span>
        </button>
        <button
          onClick={() => setActiveTab('playlists')}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-semibold tracking-wide transition-all ${
            activeTab === 'playlists'
              ? 'bg-amber-400 text-black shadow-md'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Library className="w-3.5 h-3.5" />
          <span>Your Playlists</span>
          {userToken && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
        </button>
      </div>

      {/* TAB 1: Search Crate Catalog */}
      {activeTab === 'search' && (
        <>
          <div className="mb-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search tracks, albums, artists..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-[#181b26] border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400/60 transition-colors"
              />
            </div>

            {demoNotice && (
              <div className="mt-2 text-[11px] leading-relaxed text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-md p-2 flex items-start gap-1.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{demoNotice}</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
            {loading && (
              <div className="flex items-center justify-center py-8 text-neutral-500 text-sm">
                <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mr-2" />
                Browsing records...
              </div>
            )}

            {!loading && results.length === 0 && (
              <div className="text-center py-10 text-neutral-500 text-xs">
                No records found. Try another search.
              </div>
            )}

            {!loading && results.map((item) => {
              const isSelected = item.id === currentTrackId
              const artwork = item.album?.images?.[1]?.url || item.album?.images?.[0]?.url

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTrack(item)}
                  className={`w-full text-left p-2.5 rounded-lg flex items-center gap-3 transition-all group ${
                    isSelected
                      ? 'bg-amber-500/20 border border-amber-400/40 text-amber-200'
                      : 'bg-[#151722]/60 hover:bg-[#1c2030] border border-transparent hover:border-white/5 text-neutral-300'
                  }`}
                >
                  <div className="relative w-12 h-12 rounded-md overflow-hidden bg-neutral-800 shrink-0 shadow-md">
                    {artwork ? (
                      <>
                        <div className="absolute inset-0 flex items-center justify-center text-neutral-600">
                          <Music2 className="w-5 h-5" />
                        </div>
                        <img 
                          src={artwork} 
                          alt={item.name} 
                          className="relative w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600">
                        <Music2 className="w-5 h-5" />
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-amber-500/30 flex items-center justify-center">
                        <Disc3 className="w-5 h-5 text-amber-300 animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-white group-hover:text-amber-300 transition-colors">
                      {item.name}
                    </p>
                    <p className="text-xs text-neutral-400 truncate">
                      {item.artists.map((a) => a.name).join(', ')}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-neutral-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(item.duration_ms)}</span>
                      <span className="text-neutral-600">&bull;</span>
                      <span className="truncate">{item.album?.name}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* TAB 2: Your Playlists (Spotify PKCE User Library) */}
      {activeTab === 'playlists' && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Authenticated User Header */}
          {userToken && userProfile && (
            <div className="flex items-center justify-between p-2.5 bg-[#171924] rounded-lg border border-white/5 mb-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold shrink-0">
                  {userProfile.images?.[0]?.url ? (
                    <img src={userProfile.images[0].url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    userProfile.display_name.charAt(0)
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{userProfile.display_name}</div>
                  <div className="text-[10px] text-emerald-400 font-mono">Spotify Connected</div>
                </div>
              </div>

              <button
                onClick={handleDisconnect}
                title="Disconnect library"
                className="p-1.5 rounded text-neutral-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Unauthenticated Connect Banner */}
          {!userToken && (
            <div className="p-3.5 bg-gradient-to-br from-[#1c1f2e] to-[#12141c] rounded-xl border border-white/10 mb-3 shrink-0">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
                <LogIn className="w-4 h-4" />
                <span>Connect Your Spotify Library</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed mb-3">
                Log in securely via Spotify PKCE to load your personal playlists onto the turntable. Uses metadata-only scope (<code className="text-amber-300 font-mono text-[10px]">playlist-read-private</code>).
              </p>
              
              <button
                onClick={() => {
                  try {
                    loginWithSpotify()
                  } catch (e: any) {
                    alert(e.message || 'Please configure SPOTIFY_CLIENT_ID.')
                  }
                }}
                className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
              >
                <Disc className="w-3.5 h-3.5" />
                <span>Connect with Spotify</span>
              </button>
            </div>
          )}

          {/* User / Demo Playlists List */}
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-2 px-1 shrink-0">
            <span>{userToken ? 'YOUR PLAYLIST SHELF' : 'CURATED VINYL PLAYLISTS'}</span>
            <span className="text-[10px] text-amber-400/80">CLICK TO SPIN</span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
            {isLoadingPlaylists && (
              <div className="flex items-center justify-center py-8 text-neutral-500 text-sm">
                <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mr-2" />
                Loading your crates...
              </div>
            )}

            {(!isLoadingPlaylists ? (userPlaylists.length > 0 ? userPlaylists : DEMO_USER_PLAYLISTS) : []).map((pl) => {
              const isSelected = pl.id === currentTrackId
              const cover = pl.images?.[0]?.url

              return (
                <button
                  key={pl.id}
                  onClick={() => handleSelectPlaylist(pl)}
                  className={`w-full text-left p-2.5 rounded-lg flex items-center gap-3 transition-all group ${
                    isSelected
                      ? 'bg-amber-500/20 border border-amber-400/40 text-amber-200'
                      : 'bg-[#151722]/60 hover:bg-[#1c2030] border border-transparent hover:border-white/5 text-neutral-300'
                  }`}
                >
                  <div className="relative w-12 h-12 rounded-md overflow-hidden bg-neutral-800 shrink-0 shadow-md">
                    {cover ? (
                      <>
                        <div className="absolute inset-0 flex items-center justify-center text-neutral-600">
                          <Library className="w-5 h-5" />
                        </div>
                        <img 
                          src={cover} 
                          alt="" 
                          className="relative w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600">
                        <Library className="w-5 h-5" />
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-amber-500/30 flex items-center justify-center">
                        <Disc3 className="w-5 h-5 text-amber-300 animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-white group-hover:text-amber-300 transition-colors">
                      {pl.name}
                    </p>
                    <p className="text-xs text-neutral-400 truncate">
                      {pl.description || `${pl.tracks?.total || 12} tracks`}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-amber-400/80 font-mono">
                      <span>{pl.tracks?.total || 12} TRACKS</span>
                      <span className="text-neutral-600">&bull;</span>
                      <span>VINYL PRESSING</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
