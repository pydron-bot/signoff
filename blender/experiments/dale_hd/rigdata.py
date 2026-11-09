"""Dale's rig as the game build made it (art/dale.blend): its height, and
the joints and hand frames from lib.rig at that height."""
import numpy as np

# The game build scales Dale's rig so his stance fills the hurtbox; this is
# the height it settled on (rig tail of `head`, 1.80 × 1.0408).
HEIGHT = 1.87344


def joints():
    from lib.rig import joints as j
    return j(HEIGHT)


def hand_frame(s):
    from lib.rig import hand_frame as hf
    wr, a, w, n, L = hf(joints(), s)
    return np.array(wr), np.array(a), np.array(w), np.array(n), L
