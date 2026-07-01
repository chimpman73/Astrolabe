Astrolabe Program

I want to create a program for the Spelljammer D&D setting, that will help to create different kinds of graphical maps for Spelljammer setting crystal spheres.  There will be two different kinds of graphical representations or maps, and both of them will be created from a CrystalSphere.json file.  We can create many CrystalSphere.json files in our save directory.

CrystalSphere.json file
We should be able to give each file a separate name.  Each file will contain definitions for the following:
- Crystal Sphere name
- current campaign date (will be used to link to other systems/crystal shells)
- current system date (will be used to determine object placement in orbits as measured in days from current campaign date)
List of Object
- Object
-- Object name
-- Ojject type
-- Object size
-- Object description
-- Object orbited (this is an object that this oblect orbits, if not listed, this is the central object)
--- Distance Orbited
--- Object initial angle (in 360 degrees


Bookmark draw view
The bookmark view will be 2 - 3 inches wide and 8 - 11 inches tall.  The intention is to show objects in their orbital ranges relative to the central object of the system.  We will only be drawing the top "half" of the system, with the assumption that all objects are in alignment.  For purposes of this view, we can ignore Object initial angle.
Only objects orbiting the centeral object will be displayed here.  Other objects, moons, etc, should not be shown on this view.
- Central object (distance from center = 0) will be drawn at the bottom of the Bookmark
- all other objects will be drawn at their relative position from the center, with the farthest object being the one furthest from the center.  The edge of Crystal Sphere by definition is twice the distance from the center as the furthest object.  We may or may not want to draw the crystal sphere's shell in this view (mayber we have a toggle switch)
- object orbits are drawn, but we only show the portion that fits in the bookmark view
- We should have a toggle for background color
-- background = black. objects, orbits, text, and anything else is drawn in white.
-- background = white. objects, orbits, text, and anything else is drawn in black.

System Nav Chart
This view will be a full page image.  There are 2 parts.  The first part is on the left hand side, and will list the objects in the system (from the center outward).  Each should have a symbol and name (and possibly a small description).  The entire image should present itself as a navigational scroll (made of parchment or vellum, or something similar - maybe we have different materials that can be chosen or selected.
The right hand portion of the image is the full image of the crystal shell and all objects within it.  We should see orbital paths as well (as full circles).
We may need to determine functions to calculate orbital periods and movement.  We will want a way to extend the campaign date on the map so that the objects move in their orbital positions.