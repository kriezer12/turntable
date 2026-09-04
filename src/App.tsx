import { useState } from 'react'
import { TurntableCanvas } from './components/turntable/TurntableCanvas'
import { playNeedleDropSound, playSwitchClickSound } from './utils/audioFx'

export function App() {
  const [isPowered, setIsPowered] = useState(false)
  const [isNeedleDown, setIsNeedleDown] = useState(false)
  const [volume, setVolume] = useState(0.65)
  const isPlaying = isPowered && isNeedleDown

  const togglePower = () => {
    playSwitchClickSound()
    setIsPowered((powered) => !powered)
  }

  const toggleNeedle = () => {
    playNeedleDropSound()
    setIsNeedleDown((down) => !down)
  }

  const changeVolume = () => {
    playSwitchClickSound()
    setVolume((current) => current >= 0.95 ? 0.15 : Number((current + 0.1).toFixed(2)))
  }

  return (
    <main className="listening-room" aria-label="A tabletop vinyl turntable">
      <div className="room-wordmark" aria-hidden="true">
        <span>LISTENING ROOM</span><i /><span>{isPlaying ? 'NOW SPINNING' : 'AT REST'}</span>
      </div>
      <TurntableCanvas
        isPowered={isPowered}
        isNeedleDown={isNeedleDown}
        volume={volume}
        onTogglePower={togglePower}
        onToggleNeedle={toggleNeedle}
        onChangeVolume={changeVolume}
      />
      <p className="scene-instruction">Power lever · volume knob · lift the needle</p>
    </main>
  )
}

export default App
