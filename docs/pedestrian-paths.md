# Pedestrian path network assumptions

Each pedestrian path is stored as an independent GeoJSON `LineString` in
WGS84 longitude/latitude order. A path may describe a walkway, ramp, stairs,
or another traversable segment, with an explicit wheelchair accessibility
value and optional surface and notes.

## Connectivity foundation (Milestone 4A)

`pedestrian_graph_nodes` represents explicit junctions and entrance nodes.
`pedestrian_path_connections` attaches a node to an exact zero-based LineString
vertex index. Several path vertices may reference the same node to represent a
junction. Entrances retain their canonical `location_entrances` record and are
represented by one graph node per entrance. Existing path geometry is preserved;
no graph records are backfilled automatically.

The admin editor's “New junction” action creates an explicit node at a selected
path vertex; another vertex can then be explicitly linked to that junction.
Entrance links require the selected vertex to be within 2 meters of the
entrance. This tolerance validates an explicitly requested link only.
Geometric line crossings, visual closeness, and shared-looking endpoints do not
imply connectivity. The 2D representation has no automatic grade inference:
crossing paths at different levels remain separate unless an admin confirms a
real walkable connection. The optional node level is descriptive metadata.

Endpoint links plus internal shared-node links form the graph foundation.
Admin diagnostics flag disconnected endpoints, entrances, stale references or
position drift, T-junctions and interior crossings for review, wheelchair
metadata inconsistencies, and stairs marked wheelchair accessible. They do not
calculate routes or auto-connect intersections. Moving a connected vertex or
node beyond 2 meters, or deleting a connected vertex, is rejected until its
graph links are removed. Unlinking the final connection removes an entrance
node; junction nodes are retained. Entrance/location deletion remains
restricted while an entrance node is still linked.

Entrance accessibility is currently free-form text. It is shown to admins but
is not parsed into routing constraints; routing must not infer accessibility
from phrases in this field. The graph has no directionality metadata. Milestone
4B therefore treats active paths as traversable in both directions, matching
the campus walking-network assumption; the routing implementation documents
this directly.

Public routing uses Dijkstra over explicit shared nodes and vertex references.
It ignores inactive paths, rejects stale references, and never infers links from
coordinate proximity. Wheelchair routing excludes stairs and paths not
explicitly marked accessible. Entrance accessibility text is not interpreted,
so the interface reports that entrance accessibility is unknown. GPS may snap
only to a connected graph node within 35 meters; this connector is included in
displayed distance. Walking time is approximate at 80 m/min. Routes do not
generate turn-by-turn instructions. Production coverage depends on admins
explicitly linking traversable segments, junctions, and entrances; routing does
not repair incomplete connectivity.
