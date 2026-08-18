import { useRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import ImageLightbox from '.'

/**
 * The gallery markup the CMS publishes, rendered the way an article renders it
 * -- straight into the DOM, with the lightbox listening from outside.
 */
function Gallery({ count = 3 }: { count?: number }) {
  const container = useRef<HTMLDivElement>(null)
  const items = Array.from({ length: count }, (_, index) => index + 1)

  return (
    <>
      <div
        ref={container}
        dangerouslySetInnerHTML={{
          __html: `<div data-image-gallery="${count}">${items
            .map(
              (index) =>
                `<a data-gallery-item href="/img/${index}.png" data-caption="Caption ${index}">` +
                `<img src="/img/${index}.png" alt="Image ${index}"></a>`
            )
            .join('')}</div>`
        }}
      />
      <ImageLightbox containerRef={container} />
    </>
  )
}

/** The slide the reader is actually looking at. */
function visibleImage(): HTMLImageElement {
  const image = document.querySelector<HTMLImageElement>(
    '[role="dialog"] div[aria-hidden="false"] img'
  )

  if (!image) throw new Error('No slide is visible')
  return image
}

function openAt(index: number) {
  fireEvent.click(screen.getByAltText(`Image ${index}`))
}

describe('<ImageLightbox />', () => {
  it('stays out of the way until a thumbnail is clicked', () => {
    render(<Gallery />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens on the thumbnail that was clicked', () => {
    render(<Gallery />)
    openAt(2)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(visibleImage()).toHaveAttribute('alt', 'Image 2')
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    expect(screen.getByText('Caption 2')).toBeInTheDocument()
  })

  it('slides forward past the end and back into the first image', () => {
    render(<Gallery />)
    openAt(3)

    fireEvent.click(screen.getByLabelText('Next image'))

    expect(visibleImage()).toHaveAttribute('alt', 'Image 1')
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('slides backward past the start and into the last image', () => {
    render(<Gallery />)
    openAt(1)

    fireEvent.click(screen.getByLabelText('Previous image'))

    expect(visibleImage()).toHaveAttribute('alt', 'Image 3')
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
  })

  it('answers the arrow keys and closes on Escape', () => {
    render(<Gallery />)
    openAt(1)

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(visibleImage()).toHaveAttribute('alt', 'Image 2')

    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(visibleImage()).toHaveAttribute('alt', 'Image 1')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('leaves a single-image gallery nothing to slide through', () => {
    render(<Gallery count={1} />)
    openAt(1)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByLabelText('Next image')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Previous image')).not.toBeInTheDocument()
  })

  it('lets a modified click open the image in its own tab', () => {
    render(<Gallery />)

    // The thumbnail is a real link on purpose, so cmd-click has to keep
    // working rather than being swallowed by the slideshow.
    fireEvent.click(screen.getByAltText('Image 1'), { metaKey: true })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
