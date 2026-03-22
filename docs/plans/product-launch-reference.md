# Product Launch Template — Reference Spec (The Oblist Style)

## Core Visual Style
- Background: Solid #F5F2EA (warm beige)
- Typography: Bold sans-serif font like 'Inter'. Text should be centered.
- Animations: Use spring and interpolate for all text entries. 'typewriter' effect for short phrases, 'pop-in' effect for individual words.
- Color Palette: Warm neutrals (beige, off-white), black text, high-contrast product images
- Composition: Centered, minimalist, lots of whitespace, "gallery-like" premium feel

## Sequence Components

### 1. Intro Hook
- Text slides in from the left, pushing existing text to the right
- Example: "Sorry to" becomes "Sorry to interrupt your video"
- Use a rounded pill-shaped div for key phrases
- Fast, attention-grabbing

### 2. Rhythmic Question
- Words appear individually in fast, rhythmic pattern
- Example: "when", "was", "the", "last", "time..."
- Each word scales up slightly (0.8 to 1) as it fades in
- Staccato pacing synced to audio clicks

### 3. Product Showcase
- "Stack" component: 3-4 high-quality product images
- Images fade in and out rapidly in center of screen
- Synchronized with percussive beat
- Text overlays: "see" / "what" style split text

### 4. Brand Reveal
- Background shifts to white
- Brand name scales up slowly from center
- Large, black, bold font
- Final hero product image

## Audio Integration
- Synchronize every text appearance and image transition with short 'pop' or 'click' SFX
- Use Remotion Audio component for per-element sound sync
- Overlay subtle minimalist ambient track building in intensity towards brand reveal

## Timing & Pacing
- Total: 30-40 seconds
- First half: Fast staccato text bursts (grab attention)
- Second half: Slower product showcase (build desire)
- Final: Bold brand reveal (stamp identity)
