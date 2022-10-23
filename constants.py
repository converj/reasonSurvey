
class Constants:

    # Prevent member variables from being changed.
    def __setattr__(self, name, value):
        if ( name in self.__dict__ ):
            raise TypeError('Trying to change a constant')
        self.__dict__[name]=value



#################################################################################
# Unit test

import unittest

class TestConstants(unittest.TestCase):

    def test(self):
        # Define some class constants.
        values = Constants()
        values.value = 1

        # Test that values are set.
        self.assertEqual( 1, values.value )
        
        # Test that values cannot be reset.
        with self.assertRaises(TypeError):
            values.value = 2

if __name__ == '__main__':
    unittest.main()

