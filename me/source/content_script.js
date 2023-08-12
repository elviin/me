String.prototype.remove = function (index, count) {
	return this.substring(0, index) + this.substring(index + count);
};

String.prototype.insert = function (index, string) {
  if (index > 0)
    return this.substring(0, index) + string + this.substring(index, this.length);
  else
    return string + this;
};

String.prototype.regexIndexOf = function(regex, startpos) {
    var indexOf = this.substring(startpos || 0).search(regex);
    return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
}

String.prototype.replaceAt=function(index, replacement) {
    return this.substr(0, index) + replacement+ this.substr(index + replacement.length);
}

Array.prototype.extend = function (other_array) {
    /* you should include a test to check whether other_array really is an array */
    other_array.forEach(function(v) {this.push(v)}, this);    
}

function escapeRegExp(string) {
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function regexFromString(str) {
	var match = str.match(new RegExp('^/(.*?)/([gimy]*)$'));
	if(match === null) return /a^/;
	// Add /g and /m if they weren't specified
	if( match[2].indexOf('g') === -1 ) match[2] += 'g';
	if( match[2].indexOf('m') === -1 ) match[2] += 'm';

	try {
		return new RegExp(match[1], match[2]);
	} 
	catch (err) {
		// Just drop it and return an empty replacement.
		if(err.name == 'SyntaxError') return /b^/; 
		else throw err;
	}
}

function mimicLetterCase(originalWord, replacement) {
	if(!originalWord.length) return originalWord;
	var allCaps = true, titleCase = true;

	// Isolated words that begin with a capital letter shall be titlecase by default and lowercase otherwise
	var _tcmatch = originalWord.search('/\s/') === -1;
	if( _tcmatch ) {
		titleCase = allCaps = originalWord[0].toUpperCase() == originalWord[0];
	}
	for(var i = 0; i < originalWord.length; ++i) {
		// If this letter is lowercase
		if( allCaps && originalWord[i].toUpperCase() != originalWord[i] ) {
			// Then the word can't be AllCaps
			allCaps = false;
			if( !titleCase ) break;
		}
		// If what comes after a space is a lowercase letter, this isn't TitleCase
		else if( originalWord[i].search(/\s/) === 0 ) 
		{ 
			// Skip any extra space up to the second to last character
			while( ++i < originalWord.length - 2 && originalWord[i].search(/\s/) === 0 );
			// If the next letter isn't an uppercase letter, this ain't no titlecase
			if( i >= originalWord.length || originalWord[i].search( /[A-Z]/ ) === -1 ) titleCase = false;
			if( !allCaps ) break;
		}
	}

	var result = replacement;
	// All-Caps
	if( allCaps ) {
		result = result.toUpperCase();
	}
	// TitleCase
	else if( titleCase ) {
		result = result.replace(/\w\S*/g, function(txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
	}
	// First Uppercase
	else if ( originalWord[0].toUpperCase() == originalWord[0] ) {
		result = result[0].toUpperCase() + result.substring(1).toLowerCase();
	}
	// Lowercase
	else {
		result = result.toLowerCase();
	}
	return result;
}

function replaceBackreferences(word, replacement) {
	var regexp = regexFromString(replacement.repA);

	var match = regexp.exec(word);
	// Get the content of each capturing group and replace any backreference in the replacement with it
	var _rep = replacement.repB;
	for(var j = 1; j < match.length; ++j) {
		if( !match[j] ) continue;
		var br_i;
		while( (br_i = _rep.indexOf( "\\" + j )) !== -1) {
			if( br_i > 0 && _rep[br_i - 1] == '\\' ) continue;	

			_rep = _rep.remove( br_i, 2 ).insert(br_i, match[j]);
		}

	}
	return _rep;
}

function parseTokens( word, repB, replacement ) {
	var original = replacement.repB; // The un-modified repB.
	// The empty space is because [^\\] matches anything BUT a \, but it doesn't work if there isn't a character to begin with.
	// A ? would make the match's length inconsistent, so fuck it.
	var tokens = (' ' + original).match(/[^\\]\\(C|L|I|E)/gi);
	if(!tokens) return repB;

	var index, oIndex;
	var _lastTest, _lastIndex, _xpBackref;
	tokens.forEach(function(v) {
		v = v.substring(1).toLowerCase();

		index = repB.toLowerCase().indexOf(v); // No starting position because the processed flags are already removed
		oIndex = original.toLowerCase().indexOf(v, oIndex + 1); // Starting position because original should stay intact

		if( index === -1 ) return; // Ex. when a successful if removes its else.

		repB = repB.remove(index, 2); // Remove the matched token.
		switch(v[1]) {
			case 'c': // Maintain (c)ase of the next word
				var endOfWord = repB.regexIndexOf(/(\W|$)/, index);
				var oEndOfWord = original.regexIndexOf(/(\W|$)/, oIndex + 2);

				repB = repB.remove(index, endOfWord - index).insert(index, original.substring(oIndex + 2, oEndOfWord) );
			break;
			case 'l': // Maintain case of the next letter
				repB = repB.remove(index, 1).insert(index, original.substring(oIndex + 2, oIndex + 3) );
			break;
			case 'i': // If the following capturing group was NOT matched, then insert... [Syntax: \I\1:whatever;\E:Also whatever;]
				_lastIndex = index;
				_lastTest = !/\\[1-9][0-9]?/.test( repB.substring(index, index + 2) );

				// Expand the backreference from the original replacement
				_xpBackref = replaceBackreferences(word, { repA: replacement.repA, repB: original.substring(oIndex + 2, oIndex + 4) } );
				// Apply the correct letter casing by giving it some context and then slicing it off
				var _contextualized = (repB[index - 1] || ' ') + _xpBackref;
				_xpBackref = mimicLetterCase( word, _contextualized ).substring(1);
			case 'e': // Else, insert...

				if( v[1] == 'i' ) {
					// Remove the 'if' block but not its contents unless the test failed.
					// At this point we removed everything up to the colon, the easy part
					repB = repB.substring(0, index) + repB.substring(index + _xpBackref.length + 1); 

					var _nesIndex = repB.regexIndexOf(/[^\\];/, index) + 1;
					// If the test failed, remove everything up to the semicolon
					if( !_lastTest ) {
						repB = repB.remove(index, _nesIndex - index + 1);
					}
					// Otherwise just remove the semicolon
					else {
						repB = repB.remove(_nesIndex, 1);
						// And apply proper capitalization to the contents of this if
						if(replacement.case == 'Maintain') {
							var wordToCapitalize = index > 0 ? repB.substring(index - 1, _nesIndex) : ' ' + repB.substring(index, _nesIndex);
							wordToCapitalize = mimicLetterCase( word, wordToCapitalize ).substring(1);
							repB = repB.remove(index, wordToCapitalize.length ).insert(index, wordToCapitalize);
						}
					}
				}
				else if( v[1] == 'e' ) {
					// Remove the 'else' block but not its contents.
					// Again, remove up to the colon, which is easy (the colon IS expected to be exactly adjacent to the \E)
					repB = repB.substring(0, index) + repB.substring(index + 1); 

					var _nesIndex = repB.regexIndexOf(/[^\\];/, index) + 1; 
					// If the earlier test succeeded, remove everything up to the semicolon
					if( _lastTest ) {
						repB = repB.remove(index, _nesIndex - index + 1);
					}
					// Otherwise only remove the semicolon
					else {
						repB = repB.remove(_nesIndex, 1);
						// And apply proper capitalization to the contents of this else
						if(replacement.case == 'Maintain') {
							var wordToCapitalize = index > 0 ? repB.substring(index - 1, _nesIndex) : ' ' + repB.substring(index, _nesIndex);
							wordToCapitalize = mimicLetterCase( word, wordToCapitalize ).substring(1);
							repB = repB.remove(index, wordToCapitalize.length ).insert(index, wordToCapitalize);
						}
					}
				} 
			break;
		}

	});

	return repB;
}

function _replace(str, word, replacement, _repB) {
	var repB = _repB || replacement.repB;
	if( replacement.case == 'Maintain' ) repB = mimicLetterCase(word, repB);
	// This function parses specials tokens such as \C for maintaining case on a specific word.
	repB = parseTokens(	word, repB, replacement );

	try {
		str = str.replace(new RegExp(escapeRegExp(word), 'g'), repB);
	} 
	catch (err) {
		if(err.name == 'RangeError');
		else throw err;
	}
	return str;
}

	/**
	 * Takes a string/array of strings, removes all formatting/cruft and returns the raw float value
	 * Alias: `accounting.parse(string)`
	 *
	 * Decimal must be included in the regular expression to match floats (defaults to
	 * accounting.settings.number.decimal), so if the number uses a non-standard decimal 
	 * separator, provide it as the second argument.
	 *
	 * Also matches bracketed negatives (eg. "$ (1.99)" => -1.99)
	 *
	 * Doesn't throw any errors (`NaN`s become 0) but this may change in future
	 */
function unformat(value, decimal) {
		// Recursively unformat arrays:
		// Fails silently (need decent errors):
		value = value || 0;

		// Return the value as-is if it's already a number:
		if (typeof value === "number") return value;

		// Default decimal point comes from settings, but could be set to eg. "," in opts:
		decimal = decimal || lib.settings.number.decimal;

		 // Build regex to strip out everything except digits, decimal point and minus sign:
		var regex = new RegExp("[^0-9-" + decimal + "]", ["g"]),
			unformatted = parseFloat(
				("" + value)
				.replace(/\((?=\d+)(.*)\)/, "-$1") // replace bracketed values with negatives
				.replace(regex, '')         // strip out any cruft
				.replace(decimal, '.')      // make sure decimal point is standard
			);

		// This will fail silently which may cause trouble, let's wait and see:
		return !isNaN(unformatted) ? unformatted : 0;
};

function tryReplacement(source, replacement) {
	//replacement = {active: true, case: "Maintain", repA: "/\b(EUR|USD) \d+([\.,\,]\d{3})*([\.,\,]\d{1,2})?$\b/i", repB: "CZK", type: "RegEx"}

	var replacedsource = source;
	var exp = regexFromString(replacement.repA);
	var match = exp.exec(replacedsource);
	var repB = replacement.repB;

	while( match != null ) {
		//var escapedRegExp = "\/\\b\\d+([\\.,\\,]\\d{3})*([\\.,\\,]\\d{1,2})?$\\b\/i";
		//var escapedRegExp = "/\b\d+([\.,\,]\d{3})*([\.,\,]\d{1,2})?$\b/i";
		//var escapedRegExp = "\/\\b\\$?(?=\\(.*\\)|[^()]*$)\\(?\\d{1,3}(,?\\d{3})?(\\.\\d\\d?)?\\)?$\\b\/i";
		
		console.log('match[0] ' + match[0]);

		var commaIndex = match[0].indexOf(",");
		var dotIndex = match[0].indexOf(".");

		if (dotIndex >= 0 && commaIndex >= 0) {
			if(dotIndex > commaIndex ) {
				matchPrice = Number(unformat(match[0], '.'));		
			} else {
				matchPrice = Number(unformat(match[0], ','));		
			}
		} else if (dotIndex >= 0) {
			matchPrice = Number(unformat(match[0], '.'));
		} else {
			matchPrice = Number(unformat(match[0], ','));
		}

		
		
		
		var income_per_month = replacement.income - replacement.costs; //EUR
		var hours_per_month = replacement.hours_per_month + (20 * replacement.commuting); //hrs
		var hours_per_work_day = replacement.hours_per_day + replacement.commuting; //hrs
		var price_of_item = matchPrice;

		var meValue = (hours_per_month*price_of_item)/(income_per_month*hours_per_work_day);

		var workDays = Math.trunc(meValue)
		var hours = 0;
		var meValuePrint = "ERR";
		if( workDays > 0.0) {
			hours = Math.round((meValue - workDays) * hours_per_work_day);

			if(hours == hours_per_work_day) {
				workDays = workDays + 1;
				meValuePrint = workDays.toString() + "d ";
			} else if ( hours == 0) {
				meValuePrint = workDays.toString() + "d ";
			} else {
				meValuePrint = workDays.toString() + "d " + hours.toString() + "h";
			}
		} else {
			hours = (meValue - workDays) * hours_per_work_day;
			hoursTrunc = Math.trunc(hours);
			minutes = Math.round((hours - hoursTrunc) * 60); //60 mins per 1 hour
			meValuePrint = hoursTrunc.toString() + "h " + minutes.toString() + "m";
		}
		
		replacement.repB = meValuePrint;

		console.log('meValuePrint ' + meValuePrint);
		

		repB = replaceBackreferences(match[0], replacement);
				
		var replacedPart = _replace( replacedsource.substring(match.index, match.index + match[0].length), match[0], replacement, repB );
		replacedsource = replacedsource.substring(0, match.index) + replacedPart + replacedsource.substring( match.index + match[0].length );
				
		exp.lastIndex -= (match[0].length - replacedPart.length );
		match = exp.exec( replacedsource );
	}

	return replacedsource;
}

var g_replacements;
var g_bannedtags = ['STYLE', 'SCRIPT', 'NOSCRIPT', 'TEXTAREA'];

function applyReplacements(node) {
	// Ignore any node whose tag is banned
	if( !node || $.inArray( node.tagName, g_bannedtags ) !== -1 ) return;

	try 
	{
		$(node).contents().each(function(i, v) {
			// Ignore any child node that has been replaced already or doesn't contain text
			if( v.isReplaced || v.nodeType != Node.TEXT_NODE ) return;

			// Apply each replacement in order
			g_replacements.forEach( function(replacement) {
				if( !replacement.active ) return;
				v.textContent = tryReplacement(v.textContent, replacement);
			});

			v.isReplaced = true;
		});
	} catch( err ) {
		// Basically this means that an iframe had a cross-domain source, and WR can't do much about it.
		if( err.name == 'SecurityError' ); 
		else throw err;
	}
}

function processMutations(mutations) {
	mutations.forEach(function(mut) {
		switch(mut.type) {
			case 'characterData':
				applyReplacements(mut.target);
				break;
			case 'childList':
				$(mut.addedNodes).each(function(i, node) { applyReplacements(  $(node).find('*') ); } );
				break;
		}
	});
}

function main() {
	chrome.storage.local.get(['settings', 'global'], function(items) {
		// If the extension is disabled, do nothing.
		//global = {enabled: true, showChangelog: false, version: "2.0.10"};
		//settings = [{active: true, case: "Maintain", repA: "/(EUR|USD)/i", repB: "CZK", type: "RegEx"}];
		//items = {global: global, settings: settings};
	
		if( !items.global.enabled ) return;

		g_replacements = items.settings;
		// Return if there are no replacements
		if( !g_replacements || !g_replacements.length ) return;

		// Apply the replacements once upon injection to each descendant of body
		var start = new Date().getMilliseconds();
		$('body *').each(function(i, v) { applyReplacements(v); } );

		// And also to <title>
		applyReplacements($('title')[0]);

		var end = new Date().getMilliseconds();
		console.log('Initial replacements took ' + end + 'ms.');

		// And then apply them to any DOM element that changed or that was added
		new MutationObserver(processMutations).observe(document.body, { subtree: true, childList: true, characterData: true });
	});
}

// Bind events to communicate with the browser action
chrome.runtime.onMessage.addListener(function(request, sender, callback) {
	// WR was enabled 
	if( request == 'run_cs' ) {
		main();
	}
	// WR was disabled
	if( request == 'refresh' ) {
	location.reload();
	}
});

main();