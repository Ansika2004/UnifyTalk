import type { BodyRegion } from '../types/index'

interface BodyDiagramProps {
  selectedRegions: BodyRegion[]
  onToggleRegion: (region: BodyRegion) => void
}

const REGION_LABELS: Record<BodyRegion, string> = {
  head: 'Head',
  neck: 'Neck',
  chest: 'Chest',
  abdomen: 'Abdomen',
  left_arm: 'Left Arm',
  right_arm: 'Right Arm',
  left_leg: 'Left Leg',
  right_leg: 'Right Leg',
  back: 'Back',
}

const FILL_UNSELECTED = '#d4e6f1'
const FILL_SELECTED = '#2980b9'
const STROKE = '#1a5276'

export default function BodyDiagram({ selectedRegions, onToggleRegion }: BodyDiagramProps) {
  const isSelected = (region: BodyRegion) => selectedRegions.includes(region)

  const getFill = (region: BodyRegion) =>
    isSelected(region) ? FILL_SELECTED : FILL_UNSELECTED

  const handleKeyDown = (region: BodyRegion) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggleRegion(region)
    }
  }

  const sharedProps = (region: BodyRegion) => ({
    role: 'button' as const,
    'aria-label': `Select ${REGION_LABELS[region]}`,
    'aria-pressed': isSelected(region),
    tabIndex: 0,
    onClick: () => onToggleRegion(region),
    onKeyDown: handleKeyDown(region),
    fill: getFill(region),
    stroke: STROKE,
    strokeWidth: 1.5,
    style: { cursor: 'pointer', outline: 'none' },
  })

  return (
    <div>
      <svg
        viewBox="0 0 200 400"
        width="200"
        height="400"
        aria-label="Interactive body diagram"
        role="img"
      >
        {/* Head */}
        <ellipse
          cx="100"
          cy="40"
          rx="30"
          ry="35"
          {...sharedProps('head')}
        />

        {/* Neck */}
        <rect
          x="88"
          y="72"
          width="24"
          height="20"
          {...sharedProps('neck')}
        />

        {/* Chest */}
        <rect
          x="65"
          y="92"
          width="70"
          height="70"
          {...sharedProps('chest')}
        />

        {/* Abdomen */}
        <rect
          x="65"
          y="162"
          width="70"
          height="60"
          {...sharedProps('abdomen')}
        />

        {/* Left Arm */}
        <rect
          x="30"
          y="92"
          width="30"
          height="100"
          {...sharedProps('left_arm')}
        />

        {/* Right Arm */}
        <rect
          x="140"
          y="92"
          width="30"
          height="100"
          {...sharedProps('right_arm')}
        />

        {/* Left Leg */}
        <rect
          x="65"
          y="222"
          width="30"
          height="120"
          {...sharedProps('left_leg')}
        />

        {/* Right Leg */}
        <rect
          x="105"
          y="222"
          width="30"
          height="120"
          {...sharedProps('right_leg')}
        />
      </svg>

      {/* Back button — not visible from front view */}
      <button
        role="button"
        aria-label="Select Back"
        aria-pressed={isSelected('back')}
        onClick={() => onToggleRegion('back')}
        onKeyDown={handleKeyDown('back')}
        style={{
          display: 'block',
          marginTop: '8px',
          padding: '8px 16px',
          backgroundColor: getFill('back'),
          border: `1.5px solid ${STROKE}`,
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          color: isSelected('back') ? '#fff' : '#1a5276',
          fontWeight: isSelected('back') ? 'bold' : 'normal',
        }}
      >
        Back
      </button>

      {/* Selected regions list */}
      {selectedRegions.length > 0 && (
        <div aria-live="polite" style={{ marginTop: '12px', fontSize: '14px' }}>
          <strong>Selected regions:</strong>{' '}
          {selectedRegions.map((r) => REGION_LABELS[r]).join(', ')}
        </div>
      )}
    </div>
  )
}
