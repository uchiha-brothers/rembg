from rembg import remove
from PIL import Image
import io
from flask import Flask, request, send_file, jsonify

app = Flask(__name__)

@app.route("/api/rembg", methods=["POST"])
def rembg_api():
    try:
        # Check if file exists
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]
        input_bytes = file.read()

        # Process image with rembg
        output_bytes = remove(input_bytes)

        # Return transparent PNG
        return send_file(
            io.BytesIO(output_bytes),
            mimetype="image/png",
            as_attachment=True,
            download_name="output.png"
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Required for Vercel
def handler(request):
    with app.test_request_context(
        path=request.path,
        method=request.method,
        headers=request.headers,
        data=request.get_data(),
        query_string=request.query_string
    ):
        return app.full_dispatch_request()
