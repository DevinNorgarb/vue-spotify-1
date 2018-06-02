import BaseService from './BaseService'
import SpotifyService from './SpotifyService'

let singletonPlayer

class WebPlaybackService extends BaseService {
  static initializeWebPlaybackSDK () {
    this.getPlayer()
      .then(player => console.log('Player initialized successfully.', player))
      .catch(error => console.log('Unable to initialize player. Error:', error))
  }

  // TODO handle the case where this gets called twice in quick succession
  // if the function is called again before the first one resolves, it could create two players.
  static getPlayer () {
    // giving it a name so we can recur
    const getPlayerWithRetries = retriesLeft => async resolve => {
      if (typeof singletonPlayer !== 'undefined') {
        console.log('Returning already-initialized player.')
        resolve(singletonPlayer)
        return
      }

      if (!window.Spotify || !window.Spotify.Player) {
        if (retriesLeft < 1) {
          // TODO figure out how to fail
          return
        }

        setTimeout(() => getPlayerWithRetries(retriesLeft - 1)(resolve), 1000)
        return
      }

      const token = await SpotifyService.getAccessToken()
      const player = new window.Spotify.Player({
        name: 'Spotify .5 Web Player',
        getOAuthToken: cb => { cb(token.url) }
      })

      player.addListener('initialization_error', ({ message }) => { console.error(message) })
      player.addListener('authentication_error', ({ message }) => { console.error(message) })
      player.addListener('account_error', ({ message }) => { console.error(message) })
      player.addListener('playback_error', ({ message }) => { console.error(message) })

      player.addListener('player_state_changed', state => { console.log(state) })

      player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id)

        singletonPlayer = player
        SpotifyService.transferPlayback(player._options.id)
        resolve(player)
      })

      player.connect().then(success => {
        if (success) {
          console.log('The Web Playback SDK successfully connected to Spotify!')
        }
      })
    }
    // This promise lets us pretend to return in the 'ready' event.
    return new Promise(getPlayerWithRetries(3))
  }
}

export default WebPlaybackService
