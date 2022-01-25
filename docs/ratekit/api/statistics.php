<?php
/**
 * Statistics class
 *
 * Instantiated on a request to this page.
 * statistics.php?max=XXX, queries the database for the top x entries (by average) - maximum of max results will be returned.
 * statistics.php?max=XXX&sortBy=ratings, queries the database for the top x entries (by number or ratings) - maximum of max results will be returned.
 */

include '../config.php';
include 'DB.class.php';

class Statistics {

	private $db;
	private $id;
	private $item;
	private $rating;

	function __construct() {
		$this->db   = DB::get_instance();
		$this->max = filter_var( $_GET['max'], FILTER_VALIDATE_INT );
        $this->groupBy = filter_var( $_GET['groupBy'], FILTER_SANITIZE_STRING );
        if ( ! empty( $this->max ) ) {
            $result         = array();
            if (( ! empty( $this->groupBy ) )  && ($this->groupBy == "ratings")) {
                $results = $this->db->select_top_number_ratings($this->max);
              } else {
                $results = $this->db->select_top_average_ratings($this->max);
            }
            if ( $results[0] === true ) {
                $result['status']          = 'success';
                $result['results']         =  $results[2];
            } else {
                $result['status']          = 'error';
                $result['error']           = $results[1] . ': ' . $results[2];
            }
            $this->return_json( $result );
            exit();
		}
	}

	public static function convertStrings( $some ) {
	    if (gettype($some)==='array') {
	        return array_map( [Statistics::class, 'convertStrings'], $some );
        } else {
	        return htmlentities($some);
        }
    }

	public function return_json( $arr ) {
		header( 'Content-type: application/json' );
		$arr = $this->convertStrings($arr);
		echo json_encode( $arr );
	}

}

$rating = new Statistics();
