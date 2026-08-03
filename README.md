# Tristan’s Gallery v2.48

Based on v2.47. The enlarged closed album now pauses over the visible wooden desk rather than a black reader field. A second click opens it. The lift and opening animations are unchanged.

Tristan's Gallery v2.47

Based on v2.45. Removes the redundant 'Choose an album' prompt and the separate 'Be seeing you' button from beneath the desk. The wooden desktop now uses the full available viewport height. Book and photograph animations are unchanged.

Tristan's Gallery v2.45

Based on v2.36. Stabilises the opening desk viewport to prevent the late scrollbar/width snap. Book and photograph animations are unchanged.

# Tristan's Gallery v2.35

The remaining small counter-clockwise movement was caused by a genuine 3-D endpoint mismatch.

The temporary travelling photograph was returning to `translateZ(36px)`, while the original sepia photograph sits on the actual page plane. When the temporary layer was removed, the final 36-pixel perspective drop to the page made the image appear to rotate counter-clockwise.

In v2.35:

- the travelling photograph now begins and ends on the true page plane at `translateZ(0)`;
- the outward destination, scale, timing, colour transition, book, pages and cleanup are unchanged;
- no explicit rotational compensation is applied.


## v2.36
Removed the mounted sepia photograph's permanent -0.35 degree rotation so its resting alignment exactly matches the temporary colour flight layer. The photograph animation itself is unchanged.


## v2.49
The enlarged closed album now waits on the original desk scene using the same lift image. The former held-screen scene replacement, which caused a small desk orientation and brightness snap, is no longer used.


## v2.52
The enlarged cover now remains visible while the reader scene is created beneath it, eliminating the blank disappearance. The cover-opening transition has been slowed to 1.9 seconds.


## v2.53
All page layers now share one inset geometry and book plane. The live turning-sheet stack is no longer larger than the covers, and paper remains hidden until the cover begins opening. The cold-start desktop sizing behaviour was deliberately left unchanged.


## v2.55
- Slowed the front-cover opening from 1.9 seconds to 3.1 seconds.
- Reduced the entire paper block substantially so it sits visibly within the cover.
- Retained the v2.54 per-album orientation geometry unchanged.


## v2.56
- Slowed the cover opening to 4.2 seconds with a steadier easing curve.
- Delayed all paper layers until 1.15 seconds into the opening.
- Reduced the complete paper block to 80% of the book height with wider side insets.
- Desk lift and per-book geometry are unchanged.


Update: Added an immediate global album interaction lock. Once any desk book is selected, all desk book controls are disabled before the lift begins. The lock is released only when the desk is rebuilt, preventing two albums from leaving the desk simultaneously.

v2.62 diagnostic correction: refined only album-4.png and album-7.png lower alpha-mask boundaries. The extension begins at effectively zero on the left and grows gently toward the right, with a feathered edge. No layout, motion, timing, page, photograph, caption, or other album asset was changed.
