import stripe
import argparse
import os
import sys

def verify_stripe(api_key, ein, legal_name, id_front, id_back):
    stripe.api_key = api_key
    
    print(f"🚀 Starting Stripe Final Verification for {legal_name}...")
    
    try:
        # 1. Upload ID Documents
        print("Uploading ID Front...")
        with open(id_front, "rb") as f:
            front_file = stripe.File.create(
                purpose="identity_document",
                file=f
            )
        
        print("Uploading ID Back...")
        with open(id_back, "rb") as f:
            back_file = stripe.File.create(
                purpose="identity_document",
                file=f
            )
        
        print(f"Files uploaded: Front({front_file.id}), Back({back_file.id})")
        
        # 2. Update Account Information
        # This typically updates the 'individual' or 'company' structure
        # assuming the account is a sole proprietorship or LLC for an individual.
        # We need the Account ID. If not provided, we'll try 'self'.
        account = stripe.Account.retrieve()
        print(f"Connected to Account: {account.id}")
        
        update_data = {
            "individual": {
                "first_name": legal_name.split()[0],
                "last_name": legal_name.split()[-1],
                "id_number": ein, # Often EIN is used for tax ID
                "verification": {
                    "document": {
                        "front": front_file.id,
                        "back": back_file.id
                    }
                }
            },
            "business_profile": {
                "name": legal_name
            }
        }
        
        stripe.Account.modify(account.id, **update_data)
        print("✅ Account information successfully updated and pending verification.")
        
    except Exception as e:
        print(f"❌ Error during Stripe verification: {e}")
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Stripe Final Verification Script")
    parser.add_argument("--ein", required=True, help="Employer Identification Number")
    parser.add_argument("--legal_name", required=True, help="Legal Business/Individual Name")
    parser.add_argument("--id_front", required=True, help="Path to ID front image")
    parser.add_argument("--id_back", required=True, help="Path to ID back image")
    parser.add_argument("--api_key", required=True, help="Stripe Secret API Key (sk_live_...)")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.id_front) or not os.path.exists(args.id_back):
        print("Error: ID image files not found in the specified path.")
        sys.exit(1)
        
    verify_stripe(args.api_key, args.ein, args.legal_name, args.id_front, args.id_back)
