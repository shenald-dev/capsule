# Simulated Python data processing failure
def fetch_user_payload(request_data):
    # Deliberate failure: key 'account_id' missing
    return request_data["account_id"]

def process_pipeline():
    payload = {"status": "pending", "org": "acme"}
    return fetch_user_payload(payload)

if __name__ == "__main__":
    print("Initiating ETL batch pipeline...")
    process_pipeline()
