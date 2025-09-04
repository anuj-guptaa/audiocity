from storages.backends.azure_storage import AzureStorage
import os


class AzureAudiobookStorage(AzureStorage):
    account_name = os.getenv("AZURE_ACCOUNT_NAME") 
    account_key = os.getenv("AZURE_ACCOUNT_KEY")
    azure_container = os.getenv("AZURE_CONTAINER") # single container for everything in this project
    expiration_secs = 600  # SAS token expiry in seconds