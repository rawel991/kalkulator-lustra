import math
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from shapely.geometry import Polygon, box

app = Flask(__name__)
CORS(app)

APP_PASSWORD = os.environ.get('APP_PASSWORD', 'domyslnehaslo123')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    if data and data.get('password') == APP_PASSWORD:
        return jsonify({"success": True})
    return jsonify({"success": False}), 401

@app.route('/calculate', methods=['POST'])
def calculate_bom():
    try:
        data = request.json
        W, H, d = data['W'], data['H'], data['d']
        use_edge_layout = data['useEdgeLayout']
        
        boundary = box(0, 0, W, H)
        pieces = []
        half_d = d / 2

        def process_rhombus(center_x, center_y):
            rhombus_coords = [(center_x, center_y - half_d), (center_x + half_d, center_y), (center_x, center_y + half_d), (center_x - half_d, center_y)]
            rhombus = Polygon(rhombus_coords)
            clipped_piece = rhombus.intersection(boundary)
            if not clipped_piece.is_empty and clipped_piece.area > 1e-6: pieces.append(clipped_piece)
        
        if use_edge_layout:
            centering_offset_x = (W % d) / 2; centering_offset_y = (H % d) / 2
            layout_shift = d / 2; total_offset_x = centering_offset_x + layout_shift; total_offset_y = centering_offset_y + layout_shift
            cols = math.ceil(W / half_d) + 4; rows = math.ceil(H / half_d) + 4
            for i in range(-2, cols):
                for j in range(-2, rows):
                    if (i + j) % 2 != 0: process_rhombus(i * half_d + total_offset_x, j * half_d + total_offset_y)
        else:
            offset_x = (W % d) / 2; offset_y = (H % d) / 2
            num_tiles = math.ceil(max(W, H) / d) + 2
            for i in range(-num_tiles, num_tiles):
                for j in range(-num_tiles, num_tiles):
                    process_rhombus(i * d + offset_x, j * d + offset_y)
                    process_rhombus(i * d + offset_x + half_d, j * d + offset_y + half_d)

        s = d / math.sqrt(2)
        full_area = s * s
        tolerance = 1.5
        grouped = {}
        total_perimeter = 0
        total_gross_area = 0

        cut_height_strip = (H % d) / 2
        cut_width_strip = (W % d) / 2

        for p in pieces:
            bbox = get_bounding_box(p)
            if bbox is None or bbox['width'] < 0.1 or bbox['height'] < 0.1:
                continue
            
            piece_area = p.area
            signature = ""
            gross_area_for_piece = 0
            perimeter_for_piece = 0

            is_top_bottom_docinek = abs(bbox['height'] - cut_height_strip) < tolerance if cut_height_strip > tolerance else False
            is_left_right_docinek = abs(bbox['width'] - cut_width_strip) < tolerance if cut_width_strip > tolerance else False

            if is_top_bottom_docinek or is_left_right_docinek:
                s_cut_v = cut_height_strip * math.sqrt(2)
                s_cut_h = cut_width_strip * math.sqrt(2)
                cut_dim = max(s_cut_v, s_cut_h)
                signature = f"Mały trójkąt {cut_dim:.1f} x {cut_dim:.1f} mm"
                gross_area_for_piece = cut_dim * cut_dim
                perimeter_for_piece = 4 * cut_dim
            else:
                if abs(piece_area - full_area) < tolerance:
                    signature = f"Kwadrat {s:.1f} x {s:.1f} mm"
                elif abs(piece_area - full_area / 2) < tolerance:
                    signature = f"Trójkąt {s:.1f} x {s:.1f} mm"
                else:
                    signature = f"Docinek {s:.1f} x {s:.1f} mm"
                
                gross_area_for_piece = s * s
                perimeter_for_piece = 4 * s

            grouped[signature] = grouped.get(signature, 0) + 1
            total_gross_area += gross_area_for_piece
            total_perimeter += perimeter_for_piece

        return jsonify({
            "count": sum(grouped.values()),
            "area": total_gross_area / 1000000,
            "perimeter": total_perimeter / 1000,
            "grouped": grouped
        })
    except Exception as e:
        print(f"Błąd w /calculate: {e}")
        return jsonify({"error": "Błąd po stronie serwera"}), 500

def get_bounding_box(geom):
    if geom.is_empty: return None
    min_x, min_y, max_x, max_y = geom.bounds
    return {"width": max_x - min_x, "height": max_y - min_y}

if __name__ == '__main__':
    app.run(port=5000, debug=True)
