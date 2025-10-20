import pandas as pd
import json
import os
import re

# Load the Excel file
excel_file = 'Almanique.xlsx'
df = pd.read_excel(excel_file, sheet_name='Sheet1')

# Rename columns to handle duplicates
# The first POPULATION column has trailing space, second one is the integer value
df.columns = ['country', 'capital', 'population_formatted', 'population', 'gdp', 
              'area', 'coordinates', 'official_languages', 'currency', 
              'country_code', 'religion', 'elevation', 'gold_reserves']

# Convert DataFrame to list of dictionaries
countries_list = []

for idx, row in df.iterrows():
    country_data = {
        'country': str(row['country']).strip() if pd.notna(row['country']) else '',
        'capital': str(row['capital']).strip() if pd.notna(row['capital']) else '',
        'population': int(row['population']) if pd.notna(row['population']) else None,
        'gdp': str(row['gdp']).strip() if pd.notna(row['gdp']) else '',
        'area': str(row['area']).strip() if pd.notna(row['area']) else '',
        'coordinates': str(row['coordinates']).strip() if pd.notna(row['coordinates']) else '',
        'official_languages': str(row['official_languages']).strip() if pd.notna(row['official_languages']) else '',
        'currency': str(row['currency']).strip() if pd.notna(row['currency']) else '',
        'country_code': str(row['country_code']).strip() if pd.notna(row['country_code']) else '',
        'religion': str(row['religion']).strip() if pd.notna(row['religion']) else '',
        'elevation': str(row['elevation']).strip() if pd.notna(row['elevation']) else '',
        'gold_reserves': str(row['gold_reserves']).strip() if pd.notna(row['gold_reserves']) else ''
    }
    countries_list.append(country_data)

# Create directory structure
os.makedirs('./data/processed', exist_ok=True)

# Save as JSON
output_file = './data/processed/countries.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(countries_list, f, indent=2, ensure_ascii=False)

print(f"Successfully converted {len(countries_list)} countries to JSON")
print(f"Output saved to: {output_file}")
print(f"\nFirst 3 countries as sample:")
print(json.dumps(countries_list[:3], indent=2, ensure_ascii=False))
