# Telegram Translator Bot

A simple experimental Telegram bot that translates text between languages using the Azure AI Translator API. This bot also tracks usage statistics using MongoDB and provides various commands for users to interact with.
### Please star the repo if you like it :)
## Features

- Detects the language of the input text and translates it to English.
- Translates text from English to a specified language.
- Provides usage statistics including total translations and system statistics.
- Lists supported languages.
- Tracks and displays the top translated languages.
- Allows users to send feedback.
- Tracks and displays the user's translation history.
- Allows users to delete their translation history.

## Prerequisites

- Node.js
- MongoDB
- Azure Translator API Key

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/mezbaulanam/tg-translator-azure.git
    cd tg-translator-azure
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

3. Create a `.env` file in the root directory and add your environment variables:
    ```env
    TELEGRAM_BOT_TOKEN=your_telegram_bot_token
    MONGODB_URI=your_mongodb_uri
    AZURE_TRANSLATOR_KEY=your_azure_translator_key
    ```

4. Start the bot:
    ```sh
    npm start
    ```


## Usage

### Commands

- **/translate `<text>`**: Detects the language of the input text and translates it to English.
- **/translate_to `<lang_code>` `<text>`**: Translates the input text from English to the specified language.
  - Example: `/translate_to bn Hello, how are you?`
- **/stats**: Displays usage statistics including total translations and system statistics.
- **/languages**: Lists all supported languages.
- **/feedback `<message>`**: Sends feedback to the bot developers.
- **/top_languages**: Displays the top translated languages.
- **/help**: Shows the list of available commands.
- **/history**: Retrieves and displays the user's translation history.
- **/delete_history**: Deletes the user's translation history.

### Example

1. **Translate text to English**:
    ```
    /translate Hola, ¿cómo estás?
    ```

2. **Translate text to a specified language**:
    ```
    /translate_to bn Hello, how are you?
    ```

3. **Get usage statistics**:
    ```
    /stats
    ```

4. **List supported languages**:
    ```
    /languages
    ```

5. **Send feedback**:
    ```
    /feedback This bot is amazing!
    ```

6. **Get top translated languages**:
    ```
    /top_languages
    ```

## Code Overview

### Dependencies

- `dotenv`: Loads environment variables from a `.env` file.
- `node-telegram-bot-api`: Interacts with the Telegram Bot API.
- `axios`: Makes HTTP requests to the Azure Translator API.
- `fs`: Reads the `azurevalid.json` file.
- `os`: Retrieves system statistics.
- `mongoose`: Connects to MongoDB and defines schemas and models.

### MongoDB Schemas

- **Feedback Schema**: Stores user feedback.
    ```javascript
    const feedbackSchema = new mongoose.Schema({
      username: String,
      message: String,
      date: { type: Date, default: Date.now }
    });
    ```

- **Stats Schema**: Tracks usage statistics.
    ```javascript
    const statsSchema = new mongoose.Schema({
      totalTranslations: { type: Number, default: 0 },
      languageCounts: { type: Map, of: Number, default: {} }
    });
    ```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contribution
Contributions are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines on how to contribute to this project.

If you have any questions or need further assistance, feel free to open an issue or start a discussion in the repository.
