# File name: clean_word_frequency.py

import pandas as pd

# Read the CSV file
# Note: You'll need to upload COCA_WordFrequency.csv to Colab first
df = pd.read_csv('COCA_WordFrequency.csv')

# Print original dataframe info
print("Original dataframe shape:", df.shape)
print("\nOriginal first few rows:")
print(df.head())

# Find and display duplicates
duplicates = df[df['word'].duplicated(keep='first')]
print("\nRows that will be deleted (duplicates):")
print(duplicates)

# Remove duplicates, keeping first occurrence
df_no_duplicates = df.drop_duplicates(subset='word', keep='first')

# Confirm no duplicates remain
duplicate_check = df_no_duplicates['word'].duplicated().any()
print("\nDuplicates remaining after cleaning:", duplicate_check)
print("New dataframe shape:", df_no_duplicates.shape)

# Sort by freq in descending order and reset rank
df_no_duplicates = df_no_duplicates.sort_values(by='freq', ascending=False)
df_no_duplicates['rank'] = range(1, len(df_no_duplicates) + 1)

# Reorder columns to match original format
df_no_duplicates = df_no_duplicates[['rank', 'word', 'freq']]

# Print final dataframe preview
print("\nFinal dataframe preview:")
print(df_no_duplicates.head())

# Save to new CSV file
df_no_duplicates.to_csv('COCA_WordFrequency_no_duplicates.csv', index=False)
print("\nFile saved as: COCA_WordFrequency_no_duplicates.csv")
