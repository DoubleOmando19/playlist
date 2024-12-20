try:
  Zodiac_Rat = ['1924', '1936', '1948', '1960',
                '1972', '1984', '1996', '2008', '2020']
  Zodiac_Ox = ['1925', '1937', '1949', '1961',
               '1973', '1985', '1997', '2009', '2021']
  Zodiac_Tiger = ['1926', '1938', '1950', '1962',
                  '1974', '1986', '1998', '2010', '2022']
  Zodiac_Rabbit = ['1927', '1939', '1951', '1963',
                   '1975', '1987', '1999', '2011', '2023']
  Zodiac_Dragon = ['1928', '1940', '1952', '1964',
                   '1976', '1988', '2000', '2012', '2024']
  Zodiac_Snake = ['1929', '1941', '1953', '1965',
                  '1977', '1989', '2001', '2013', '2025']
  Zodiac_Horse = ['1930', '1942', '1954', '1966',
                  '1978', '1990', '2002', '2014', '2026']
  Zodiac_Goat = ['1931', '1943', '1955', '1967',
                 '1979', '1991', '2003', '2015', '2027']
  Zodiac_Monkey = ['1932', '1944', '1956', '1968',
                   '1980', '1992', '2004', '2016', '2028']
  Zodiac_Rooster = ['1933', '1945', '1957', '1969',
                    '1981', '1993', '2005', '2017', '2029']
  Zodiac_Dog = ['1934', '1946', '1934', '1946', '1958',
                '1970', '1982', '1994', '2006', '2018', '2030']
  Zodiac_Pig = ['1935', '1947', '1959', '1971',
                '1983', '1995', '2007', '2019', '2031']
  
  user_input = input(
      "Searching...\n ")
  
  for x in Zodiac_Rat:
      if x == user_input:
          print('Your Chinese Zodiac is Rat.', x, '🐀')
  
  for x in Zodiac_Ox:
      if x == user_input:
          print('Your Chinese Zodiac is Ox.', x, '🐂')
  
  for x in Zodiac_Tiger:
      if x == user_input:
          print('Your Chinese Zodiac is Tiger.', x, '🐅')
  
  for x in Zodiac_Rabbit:
      if x == user_input:
          print('Your Chinese Zodiac is Rabbit.', x, '🐇')
  
  for x in Zodiac_Dragon:
      if x == user_input:
          print('Your Chinese Zodiac is Dragon.', x, '🐲')
  
  for x in Zodiac_Snake:
      if x == user_input:
          print('Your Chinese Zodiac is Snake.', x, '🐍')
  
  for x in Zodiac_Horse:
      if x == user_input:
          print('Your Chinese Zodiac is Horse.', x, '🐎')
  
  for x in Zodiac_Goat:
      if x == user_input:
          print('Your Chinese Zodiac is Goat.', x, '🐐')
  
  for x in Zodiac_Monkey:
      if x == user_input:
          print('Your Chinese Zodiac is Monkey.', x, '🐵')
  
  for x in Zodiac_Rooster:
      if x == user_input:
          print('Your Chinese Zodiac is Rooster.', x, '🐓')
  
  for x in Zodiac_Dog:
      if x == user_input:
          print('Your Chinese Zodiac is Dog.', x, '🐕')
  
  for x in Zodiac_Pig:
      if x == user_input:
          print('Your Chinese Zodiac is Pig.', x, '🐖')
except ValueError as ex:
  print(ex)
