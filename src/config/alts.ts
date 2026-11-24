// RULE: every gallery photo's alt describes what is in that frame (written by looking at each photo) | PREVENTS: "photo 3 of 10" alts that tell search engines and screen readers nothing.
export const photoAlts: Record<string, string> = {
  // Romantic Proposal
  Romantic_Proposal_1: 'Red rose arch with a Will You Marry Me neon sign overlooking a river',
  Romantic_Proposal_2: 'Heart of red roses framing a riverside balcony with candles',
  Romantic_Proposal_3: 'Red roses and candles along a stone balcony railing',
  Romantic_Proposal_4: 'Two bottles of sparkling wine on a ledge above the river',
  Romantic_Proposal_5: 'Red rose heart arch with a Will You Marry Me sign and candles',
  Romantic_Proposal_6: 'A hand with an engagement ring resting on a bouquet of red roses',
  Romantic_Proposal_7: 'Red rose arch with a neon proposal sign beside a stone column',
  // 80s Disco Party
  '80s_Disco_Party_1': 'Basket of glow sticks and 80s-themed props on a party table',
  '80s_Disco_Party_2': 'Record player with an orange vinyl record and an 80s album cover',
  '80s_Disco_Party_3': 'Back to the 80s backdrop with a colourful balloon garland',
  '80s_Disco_Party_4': 'Party table with disco ball plates, records and props',
  '80s_Disco_Party_5': 'Flowers, disco balls and party props in front of a rainbow tinsel curtain',
  '80s_Disco_Party_6': 'Silver disco ball balloon above a Back to the 80s sequin wall',
  '80s_Disco_Party_7': 'Party props on a table in front of a rainbow tinsel curtain',
  '80s_Disco_Party_8': 'Tray of colourful novelty sunglasses beside a basket of glow sticks',
  '80s_Disco_Party_9': 'Disco ball cups and silver star balloons on a white table',
  '80s_Disco_Party_10': 'Gold Back to the 80s balloon letters on a silver sequin wall',
  // Butterfly Birthday Party
  Butterfly_Birthday_Party_1: 'Blue drinks topped with paper butterflies',
  Butterfly_Birthday_Party_2: 'Guest with birthday balloons beside a blue butterfly cake',
  Butterfly_Birthday_Party_3: 'Skewers and kebabs on the barbecue',
  Butterfly_Birthday_Party_4: 'Guest by a silver sequin wall with a Happy Birthday sign',
  Butterfly_Birthday_Party_5: 'Blue butterfly birthday cake with lit candles and blue drinks',
  Butterfly_Birthday_Party_6: 'Guests singing and celebrating at the birthday party',
  // Dreamy Bachelorette Party
  Dreamy_Bachelorette_Party_1: 'Gold arch with white drapery and eucalyptus by the water',
  Dreamy_Bachelorette_Party_2: 'Pink cocktails beside Team Bride sashes on a white table',
  Dreamy_Bachelorette_Party_3: 'Paper diamond ring decorations on a gold-themed table',
  Dreamy_Bachelorette_Party_4: 'Cake on a gold tray beside Team Bride sashes',
  Dreamy_Bachelorette_Party_5: 'Pink cocktails framed by a gold ring balloon',
  Dreamy_Bachelorette_Party_6: 'Gold arch with drapery, eucalyptus and gold balloon letters by the water',
  Dreamy_Bachelorette_Party_7: 'Bride To Be and Team Bride sashes laid out on a table',
  Dreamy_Bachelorette_Party_8: 'Gold arch with eucalyptus under string lights and a willow tree',
  Dreamy_Bachelorette_Party_9: 'Paper diamond ring decorations with gold balloons',
  Dreamy_Bachelorette_Party_10: 'Gold arch with white drapery on a deck under a willow tree',
  Dreamy_Bachelorette_Party_11: 'Gold ring balloon framing pink drinks and Team Bride sashes',
  // Photography (one photo per service)
  Event_Photography: 'Bride in a strapless gown holding a bouquet beside the groom in a tuxedo',
  Professional_Headshots: 'Woman in a brown turtleneck photographed against a dark backdrop',
  Product_Photography: 'Skincare bottles and jars arranged on a white shelf with greenery',
  Milestone_Photos: 'Graduate in a red gown holding a diploma on a sunny campus',
  Casual_Photoshoot: 'Smiling man in a black t-shirt on a rooftop overlooking the city',
};
export const altFor = (name: string, fallback: string) => photoAlts[name] ?? fallback;
