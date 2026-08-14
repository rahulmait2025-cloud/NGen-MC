---
name: Kinetic Editorial
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#444748'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#b32a00'
  on-secondary: '#ffffff'
  secondary-container: '#fe5e35'
  on-secondary-container: '#5a1000'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1a1c1c'
  on-tertiary-container: '#838484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#ffdbd2'
  secondary-fixed-dim: '#ffb4a2'
  on-secondary-fixed: '#3c0800'
  on-secondary-fixed-variant: '#891d00'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c6'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 72px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
  annotation:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
spacing:
  unit: 4px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  stack-sm: 12px
  stack-md: 32px
  stack-lg: 80px
---

## Brand & Style

The design system is built on the philosophy of "Serious Play." It targets a high-level technical audience that values both engineering excellence and human personality. The aesthetic is a fusion of **Modern Editorial** and **Refined Neo-Brutalism**, leaning heavily into high-contrast structures and asymmetrical balance.

The visual language avoids the generic "softness" of typical SaaS platforms. Instead, it utilizes sharp corners, thin industrial borders, and intentional "ink-trap" typography to create a sense of precision. To maintain the "human" element, the UI incorporates marker-style annotations and stamps that act as a meta-layer over the structured layouts, suggesting a team that critiques and iterates in real-time.

**Design Principles:**
- **Asymmetric Precision:** Layouts should feel active and intentional, never perfectly centered or predictable.
- **The Human Redline:** Use handwritten-style annotations to highlight key achievements or fun facts about team members.
- **High-End Tactility:** Surfaces are flat and opaque, relying on line-weight and spacing rather than depth to convey hierarchy.

## Colors

The palette is strictly limited to ensure a premium, editorial feel. 

- **Background (#F9F9F9):** A warm off-white that provides a sophisticated canvas, reducing the harshness of pure white.
- **Ink (#1A1A1A):** Used for all structural elements, borders, and primary text. It provides a heavy, authoritative weight.
- **The Spark (#FF5F36):** A vibrant, high-energy orange used sparingly for calls to action, important status indicators, and the "handwritten" annotation layer.
- **The Mute (#E5E5E5):** Used for secondary borders, disabled states, and subtle layout dividers.

## Typography

Typography is the primary driver of the brand's personality. 

**Space Grotesk** is used for all headlines and labels. Its quirky geometric construction and exaggerated apertures reflect the "creative/funny" persona without sacrificing readability. Large display text should always use tight letter spacing.

**Plus Jakarta Sans** provides a clean, approachable contrast for body copy. It is highly legible and balances the sharp edges of the headlines with a softer, more humanistic touch.

**The Annotation Style:** For the "handwritten" look, use `annotation` tokens in the Primary Orange. These should be placed at slight rotations (-2 to 3 degrees) to break the grid.

## Layout & Spacing

The layout philosophy follows a **Rigid-Fluid hybrid**. While elements sit on a 12-column grid, the positioning of cards and images should feel staggered.

- **Asymmetry:** On team listing pages, avoid even rows. Use a "masonry-lite" approach where cards in the second column start at a different vertical offset than the first.
- **Negative Space:** Use `stack-lg` (80px) generously between sections to allow the bold typography to breathe.
- **Borders:** All primary containers use a 1px solid #1A1A1A border. This border is the primary separator, replacing the need for shadows.

## Elevation & Depth

This design system rejects all forms of blurring, shadows, or gradients. Depth is achieved strictly through:

1.  **Layer Stacking:** Elements are either on the base layer (#F9F9F9) or contained within a bordered card.
2.  **Offset Fills:** To create a "pop," use a solid #1A1A1A or #FF5F36 offset rectangle behind a card (positioned 4px to 8px down and right) to simulate a physical shadow without using a blur.
3.  **High-Contrast Overlays:** Modals or drawers should use a solid, opaque border and a slight offset from the center to maintain the asymmetric aesthetic.

## Shapes

The design system uses a **Sharp (0px)** roundedness strategy. Every corner in the UI—from buttons to cards to images—is a perfect 90-degree angle. This reinforces the "architectural/technical" side of the CTO team. 

The only exceptions are the "handwritten" annotation elements and stamp icons, which should feel like they were applied manually to the digital surface.

## Components

### Buttons
- **Primary:** Solid #1A1A1A background, white text, 0px radius. On hover, the button slides 4px up and left, revealing a #FF5F36 solid "shadow" underneath.
- **Secondary:** Transparent background, 1px solid #1A1A1A, 0px radius.

### Team Cards (Editorial Style)
Cards should use a vertical layout. The top section is a high-contrast B&W photo, followed by a 1px divider, then the name in `headline-lg`. A "stamp" (e.g., "CTO APPROVED") should be placed overlapping the photo corner at an angle.

### Input Fields
Strictly rectangular. 1px solid #1A1A1A. Labels should be in `label-caps` positioned above the input. Focus state changes the border weight to 2px or adds the accent orange color.

### Chips / Tags
Small rectangular boxes with 1px #1A1A1A borders. For special skills or funny traits, use the `annotation` font style with a small #FF5F36 marker circle next to the text.

### Handwritten Annotations
Use a custom component that renders text in the secondary color with a "rough" texture or marker-stroke style. These are used for side-comments like *"Basically a wizard"* or *"Coffee-to-Code Converter."*