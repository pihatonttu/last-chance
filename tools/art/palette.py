"""Reduce rendered art to a 256-colour palette with alpha (used by the kenney-*-post scripts).

Pillow's FASTOCTREE, the only built-in method for RGBA, sorts colours into 16 levels per
channel, so whites closer than that merge: steam over snow, a snow bank by the pool and the
seams of the snow-block igloos all turned into one flat snow colour. This is a median cut
over the picture's own colours instead: the box of colours that spreads furthest (weighted
by how many pixels it covers) is split at its median until there are 256, and each palette
entry is its box's average. Colours are compared premultiplied by alpha, so the faint edge
pixels do not claim entries of their own. Needs numpy.
"""
import numpy
from PIL import Image


def quantize(image, colours=256):
    """A 'P' image with an RGBA palette (PNG tRNS) that looks like `image`."""
    data = numpy.asarray(image.convert('RGBA'))
    flat = data.reshape(-1, 4).copy()
    flat[flat[:, 3] == 0] = 0  # every fully transparent pixel is the same colour
    uniq, inverse, counts = numpy.unique(flat, axis=0, return_inverse=True, return_counts=True)
    inverse = inverse.reshape(-1)
    alpha = uniq[:, 3:4] / 255
    space = numpy.hstack([uniq[:, :3] * alpha, uniq[:, 3:4]]).astype(numpy.float64)

    def entry(box):
        spread = space[box].max(0) - space[box].min(0)
        axis = int(spread.argmax())
        return spread[axis] * numpy.sqrt(counts[box].sum()), axis, box

    boxes = [entry(numpy.arange(len(uniq)))]
    while len(boxes) < colours:
        best = max(range(len(boxes)), key=lambda i: boxes[i][0])
        score, axis, box = boxes[best]
        if score <= 0:
            break  # every box holds a single colour: the picture already fits
        boxes.pop(best)
        order = box[numpy.argsort(space[box, axis], kind='stable')]
        cumulative = numpy.cumsum(counts[order])
        cut = min(max(int(numpy.searchsorted(cumulative, cumulative[-1] / 2)) + 1, 1), len(order) - 1)
        boxes += [entry(order[:cut]), entry(order[cut:])]

    palette = numpy.zeros((len(boxes), 4), numpy.uint8)
    index = numpy.zeros(len(uniq), numpy.uint8)
    for i, (_, _, box) in enumerate(boxes):
        weight = counts[box].astype(numpy.float64)
        mean = (space[box] * weight[:, None]).sum(0) / weight.sum()
        rgb = mean[:3] * 255 / mean[3] if mean[3] > 0 else numpy.zeros(3)
        palette[i] = [*numpy.clip(numpy.round(rgb), 0, 255), round(mean[3])]
        index[box] = i
    out = Image.fromarray(index[inverse].reshape(data.shape[:2]))
    out.putpalette(palette.reshape(-1).tobytes(), rawmode='RGBA')
    return out
